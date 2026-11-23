"""Escritura en OpenLDAP: membresía de grupos y alta de cuentas (FNC-041).

- Usa el cliente único de FNC-040 (`ClienteDirectorio`) con una conexión de
  escritura; TLS, tiempos de espera y registro de errores son los del cliente.
- Solo escribe bajo las bases configuradas: grupos bajo `LDAP_GROUPS_BASE_DN`
  y cuentas bajo `LDAP_USERS_BASE_DN`, comparando RDN normalizados
  (SEC-LDAP-04). Que el grupo esté registrado en una plataforma lo valida el
  llamador (FNC-049).
- Membresía: solo `MODIFY_ADD` y `MODIFY_DELETE` de un valor del atributo de
  membresía; nunca `REPLACE` (SEC-LDAP-07). Idempotente: un miembro existente
  o ausente da `YA_ESTABA` (SEC-LDAP-08).
- Último miembro de un grupo que exige uno (`groupOfNames`,
  `groupOfUniqueNames`): con `LDAP_GROUP_PLACEHOLDER_MEMBER` se agrega el
  relleno y se quita al usuario en la misma operación; sin él, no se quita y
  el resultado es `ERROR_PERMANENTE` (`ultimo_miembro`). Al agregar un miembro
  real se quita el relleno en la misma operación (decisión del dueño,
  2026-10-15).
- Alta de cuentas: identificador y correo validados, y el identificador se
  escapa al formar el DN (SEC-LDAP-06). La contraseña inicial (P8 modificada,
  ADR-008) se fija después del alta con Password Modify (RFC 3062), nunca como
  `userPassword` en claro; si el servidor la rechaza (`ppolicy`) o falla, la
  entrada recién creada se retira para no dejar una cuenta sin contraseña.
  El rechazo de `ppolicy` es el motivo `contrasena_rechazada`, sin el texto
  del servidor. No hay borrado de cuentas en v1 (salvo esa limpieza).
- Nunca lanza por fallos del directorio: devuelve `ResultadoEscritura`. El
  log de un fallo de escritura lleva solo el código de resultado, sin el DN
  ni el mensaje del servidor (pueden nombrar a la persona).
"""
import logging
import re
from dataclasses import dataclass, field

from ldap3 import BASE, MODIFY_ADD, MODIFY_DELETE, SUBTREE
from ldap3.core.exceptions import (LDAPAttributeOrValueExistsResult,
                                   LDAPConstraintViolationResult,
                                   LDAPEntryAlreadyExistsResult,
                                   LDAPException, LDAPNoSuchAttributeResult,
                                   LDAPNoSuchObjectResult,
                                   LDAPSizeLimitExceededResult,
                                   LDAPUnwillingToPerformResult)

from app.modules.directory.dn import bajo_base, mismo_dn, separar_dn
from app.modules.directory.errors import (MOTIVO_DATOS_INCOMPLETOS,
                                          MOTIVO_DATOS_INVALIDOS,
                                          MOTIVO_DESTINO_INEXISTENTE,
                                          MOTIVO_DESTINO_OCUPADO,
                                          MOTIVO_DIRECTORIO,
                                          MOTIVO_FUERA_DE_BASE,
                                          MOTIVO_GRUPO_INEXISTENTE,
                                          MOTIVO_MOVER_NO_CONFIGURADO,
                                          MOTIVO_ULTIMO_MIEMBRO,
                                          MOTIVO_USUARIO_INEXISTENTE,
                                          Resultado, ResultadoEscritura,
                                          clasificar_error)
from app.modules.directory.ldap_client import (
    ATRIBUTOS_MIEMBRO_POR_IDENTIFICADOR, ClienteDirectorio, ErrorDirectorio,
    UsuarioDirectorio, escapar_filtro, escapar_valor_dn, valor_de_membresia)

logger = logging.getLogger(__name__)

# Clases de grupo cuyo atributo de membresía es obligatorio (≥ 1 valor).
CLASES_GRUPO_CON_MIEMBRO_OBLIGATORIO = frozenset({'groupofnames',
                                                  'groupofuniquenames'})

# Atributos de inetOrgPerson que se llenan en el alta. Provisionales hasta
# que ADR-004 cierre la lista de atributos de alta (P3).
ATRIBUTO_NOMBRE_COMPLETO = 'cn'
ATRIBUTO_APELLIDO = 'sn'
ATRIBUTO_NOMBRE = 'givenName'
ATRIBUTO_CORREO = 'mail'

# Formatos aceptados en el alta (se usan con `fullmatch`) (auditor-seguridad, 2026-10-15). El contrato
# `usuarios-directorio.md` (FNC-064) agrega largos y primer carácter.
PATRON_IDENTIFICADOR = re.compile(r'[a-z0-9._-]+')
PATRON_CORREO = re.compile(r'[^@\s]+@[^@\s]+\.[^@\s]+')


@dataclass(frozen=True)
class DatosCuenta:
    """Datos de una cuenta nueva."""

    identificador: str
    nombre: str
    apellido: str
    correo: str
    password: str | None = field(default=None, repr=False)


def _leer_grupo(conexion, cfg, dn):
    """Entrada del grupo con su atributo de membresía; `None` si no existe."""
    try:
        conexion.search(dn, f'(objectClass={cfg.clase_grupo})', BASE,
                        attributes=[cfg.atributo_miembro])
    except LDAPNoSuchObjectResult:
        return None
    return conexion.entries[0] if conexion.entries else None


def _valores_miembro(entrada, atributo):
    if atributo not in entrada:
        return []
    return [str(valor) for valor in entrada[atributo].values]


def _existe(conexion, dn):
    try:
        conexion.search(dn, '(objectClass=*)', BASE, attributes=[])
    except LDAPNoSuchObjectResult:
        return False
    return bool(conexion.entries)


# Motivos cuando la contraseña no quedó fijada (sin la contraseña ni el texto
# del servidor): el servidor no aceptó Password Modify, o su `ppolicy` la
# rechazó (calidad, longitud, historial).
MOTIVO_CONTRASENA_NO_APLICADA = 'contrasena_no_aplicada'
MOTIVO_CONTRASENA_RECHAZADA = 'contrasena_rechazada'
# Resultados con los que `ppolicy` rechaza una contraseña.
RECHAZOS_DE_POLITICA = (LDAPConstraintViolationResult,
                        LDAPUnwillingToPerformResult)


def _fijar_contrasena(conexion, dn, contrasena):
    """Password Modify (RFC 3062): el servidor cifra la contraseña con su
    esquema (`olcPasswordHash`) y aplica su `ppolicy`.

    `None` si la aceptó; si no, el motivo (`MOTIVO_CONTRASENA_*`). Otros
    fallos (red, permisos) se propagan como `LDAPException`.
    """
    try:
        aceptada = conexion.extend.standard.modify_password(
            user=dn, new_password=contrasena)
    except RECHAZOS_DE_POLITICA:
        return MOTIVO_CONTRASENA_RECHAZADA
    return None if aceptada else MOTIVO_CONTRASENA_NO_APLICADA


class EscritorDirectorio:
    """Escritura idempotente con la cuenta de servicio (SEC-LDAP-03)."""

    def __init__(self, cliente=None):
        self.cliente = cliente or ClienteDirectorio()
        self.configuracion = self.cliente.configuracion

    # ------------------------------------------------------------------ #
    # Utilidades
    # ------------------------------------------------------------------ #

    def _coincide(self, guardado, valor):
        if (self.configuracion.atributo_miembro.lower()
                in ATRIBUTOS_MIEMBRO_POR_IDENTIFICADOR):
            return guardado == valor
        return mismo_dn(guardado, valor)

    def _grupo_en_base(self, group_dn):
        """Grupo bajo la base de activos o, si está configurada, bajo la de
        inactivos (FNC-163: un grupo movido sigue siendo del portal)."""
        cfg = self.configuracion
        return (bajo_base(group_dn, cfg.grupos_base_dn)
                or bool(cfg.grupos_inactivos_base_dn
                        and bajo_base(group_dn, cfg.grupos_inactivos_base_dn)))

    def _fuera_de_base(self, group_dn, usuario):
        cfg = self.configuracion
        return not (self._grupo_en_base(group_dn)
                    and bajo_base(usuario.dn, cfg.usuarios_base_dn)
                    and valor_de_membresia(cfg, usuario))

    def _normalizar_usuario(self, user):
        """Convierte `user` (str o `UsuarioDirectorio`) en `UsuarioDirectorio`."""
        if isinstance(user, UsuarioDirectorio):
            return user
        if isinstance(user, str):
            identificador = user.strip()
            cfg = self.configuracion
            if ',' in identificador:
                rdn = identificador.split(',')[0]
                uid = rdn.split('=', 1)[1] if '=' in rdn else identificador
                return UsuarioDirectorio(dn=identificador, identificador=uid)
            dn = (f'{cfg.atributo_usuario}='
                  f'{escapar_valor_dn(identificador)},{cfg.usuarios_base_dn}')
            return UsuarioDirectorio(dn=dn, identificador=identificador)
        return user

    def _ejecutar(self, operacion, dn, accion):
        """Corre `accion(conexion)` y convierte cualquier fallo en resultado."""
        try:
            with self.cliente.conexion_servicio(solo_lectura=False) as conexion:
                resultado = accion(conexion)
        except ErrorDirectorio as exc:  # conexión: el cliente ya lo registró
            resultado = ResultadoEscritura(clasificar_error(exc.causa), dn,
                                           MOTIVO_DIRECTORIO)
        except LDAPException as exc:
            self.cliente.registrar_error(operacion, exc, con_detalle=False)
            resultado = ResultadoEscritura(clasificar_error(exc), dn,
                                           MOTIVO_DIRECTORIO)
        logger.info('Directorio: %s → %s', operacion,
                    resultado.resultado.value)
        return resultado

    # ------------------------------------------------------------------ #
    # Membresía
    # ------------------------------------------------------------------ #

    def add_member(self, group_dn, user):
        """Agrega `user` (`UsuarioDirectorio` o str) al grupo `group_dn`."""
        user = self._normalizar_usuario(user)
        if not user or not getattr(user, 'dn', None):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                      MOTIVO_DATOS_INCOMPLETOS)
        if self._fuera_de_base(group_dn, user):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                      MOTIVO_FUERA_DE_BASE)
        cfg = self.configuracion
        atributo = cfg.atributo_miembro
        valor = valor_de_membresia(cfg, user)

        def alta_miembro(conexion):
            entrada = _leer_grupo(conexion, cfg, group_dn)
            if entrada is None:
                return ResultadoEscritura(Resultado.NO_EXISTE, group_dn,
                                          MOTIVO_GRUPO_INEXISTENTE)
            if not _existe(conexion, user.dn):
                return ResultadoEscritura(Resultado.NO_EXISTE, group_dn,
                                          MOTIVO_USUARIO_INEXISTENTE)
            guardados = _valores_miembro(entrada, atributo)
            if any(self._coincide(guardado, valor) for guardado in guardados):
                return ResultadoEscritura(Resultado.YA_ESTABA, group_dn)
            cambios = [(MODIFY_ADD, [valor])]
            rellenos = [g for g in guardados if cfg.miembro_relleno
                        and self._coincide(g, cfg.miembro_relleno)]
            if rellenos:
                # Con un miembro real el relleno sobra; misma operación.
                cambios.append((MODIFY_DELETE, rellenos))
            try:
                conexion.modify(group_dn, {atributo: cambios})
            except LDAPAttributeOrValueExistsResult:
                return ResultadoEscritura(Resultado.YA_ESTABA, group_dn)
            return ResultadoEscritura(Resultado.HECHO, group_dn)

        return self._ejecutar('alta de miembro', group_dn, alta_miembro)

    def remove_member(self, group_dn, user):
        """Quita `user` (`UsuarioDirectorio` o str) del grupo `group_dn`."""
        user = self._normalizar_usuario(user)
        if not user or not getattr(user, 'dn', None):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                      MOTIVO_DATOS_INCOMPLETOS)
        if self._fuera_de_base(group_dn, user):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                      MOTIVO_FUERA_DE_BASE)
        cfg = self.configuracion
        atributo = cfg.atributo_miembro
        valor = valor_de_membresia(cfg, user)

        def baja_miembro(conexion):
            entrada = _leer_grupo(conexion, cfg, group_dn)
            if entrada is None:
                return ResultadoEscritura(Resultado.NO_EXISTE, group_dn,
                                          MOTIVO_GRUPO_INEXISTENTE)
            guardados = _valores_miembro(entrada, atributo)
            del_usuario = [g for g in guardados if self._coincide(g, valor)]
            if not del_usuario:
                return ResultadoEscritura(Resultado.YA_ESTABA, group_dn)
            cambios = [(MODIFY_DELETE, del_usuario)]
            restantes = [g for g in guardados if g not in del_usuario]
            if (cfg.clase_grupo.lower() in CLASES_GRUPO_CON_MIEMBRO_OBLIGATORIO
                    and not restantes):
                if not cfg.miembro_relleno:
                    logger.error('Directorio: no se quita el último miembro '
                                 'de %s; falta LDAP_GROUP_PLACEHOLDER_MEMBER',
                                 group_dn)
                    return ResultadoEscritura(Resultado.ERROR_PERMANENTE,
                                              group_dn, MOTIVO_ULTIMO_MIEMBRO)
                # Una sola operación: el grupo nunca queda sin miembros.
                cambios.insert(0, (MODIFY_ADD, [cfg.miembro_relleno]))
            try:
                conexion.modify(group_dn, {atributo: cambios})
            except LDAPNoSuchAttributeResult:
                return ResultadoEscritura(Resultado.YA_ESTABA, group_dn)
            return ResultadoEscritura(Resultado.HECHO, group_dn)

        return self._ejecutar('baja de miembro', group_dn, baja_miembro)

    # ------------------------------------------------------------------ #
    # Mover grupos entre OU (FNC-163)
    # ------------------------------------------------------------------ #

    def _destino_valido(self, nuevo_padre):
        """El padre destino es la OU de inactivos (o algo debajo) o la base de
        activos (o algo debajo): nunca otra parte del árbol."""
        cfg = self.configuracion
        return (bajo_base(nuevo_padre, cfg.grupos_base_dn, incluir_base=True)
                or bool(cfg.grupos_inactivos_base_dn and bajo_base(
                    nuevo_padre, cfg.grupos_inactivos_base_dn,
                    incluir_base=True)))

    def mover_grupo(self, group_dn, nuevo_padre):
        """Mueve el grupo `group_dn` debajo de `nuevo_padre` (ModifyDN con
        `new_superior`, mismo RDN: el `cn` no cambia ni se tocan los miembros).

        Idempotente: ya bajo `nuevo_padre` → `YA_ESTABA`. Origen inexistente →
        `NO_EXISTE` aunque haya algo en el destino (puede ser el grupo de otra
        plataforma con el mismo `cn`; auditor-seguridad). Sin `LDAP_GROUPS_INACTIVE_
        BASE_DN` no se mueve nada. El resultado lleva el DN **final**.
        """
        cfg = self.configuracion
        if not cfg.grupos_inactivos_base_dn:
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                      MOTIVO_MOVER_NO_CONFIGURADO)
        partes = separar_dn(group_dn)
        if (partes is None or not self._grupo_en_base(group_dn)
                or not self._destino_valido(nuevo_padre)):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                      MOTIVO_FUERA_DE_BASE)
        rdn = partes[0]
        destino = f'{rdn},{nuevo_padre}'
        if mismo_dn(group_dn, destino):
            return ResultadoEscritura(Resultado.YA_ESTABA, destino)

        def mover(conexion):
            if not _existe(conexion, group_dn):
                # Estricto: que el destino exista no prueba que sea este grupo
                # (otro con el mismo cn); ya movido lo sabe el registro.
                return ResultadoEscritura(Resultado.NO_EXISTE, group_dn,
                                          MOTIVO_GRUPO_INEXISTENTE)
            if not _existe(conexion, nuevo_padre):
                return ResultadoEscritura(Resultado.NO_EXISTE, group_dn,
                                          MOTIVO_DESTINO_INEXISTENTE)
            if _existe(conexion, destino):  # otro grupo con el mismo cn
                return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                          MOTIVO_DESTINO_OCUPADO)
            try:
                conexion.modify_dn(group_dn, rdn, new_superior=nuevo_padre)
            except LDAPEntryAlreadyExistsResult:
                return ResultadoEscritura(Resultado.ERROR_PERMANENTE, group_dn,
                                          MOTIVO_DESTINO_OCUPADO)
            except LDAPNoSuchObjectResult:
                return ResultadoEscritura(Resultado.NO_EXISTE, group_dn,
                                          MOTIVO_GRUPO_INEXISTENTE)
            return ResultadoEscritura(Resultado.HECHO, destino)

        return self._ejecutar('mover grupo', group_dn, mover)

    # ------------------------------------------------------------------ #
    # Alta de cuentas
    # ------------------------------------------------------------------ #

    def create_user(self, datos):
        """Crea la cuenta en `LDAP_USERS_BASE_DN`; con `datos.password`, la fija
        después con Password Modify (cifrada por el servidor, FNC-138)."""
        cfg = self.configuracion
        if not all(str(campo or '').strip() for campo in (
                datos.identificador, datos.nombre, datos.apellido,
                datos.correo)):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE,
                                      cfg.usuarios_base_dn,
                                      MOTIVO_DATOS_INCOMPLETOS)
        if not (PATRON_IDENTIFICADOR.fullmatch(datos.identificador)
                and PATRON_CORREO.fullmatch(datos.correo)):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE,
                                      cfg.usuarios_base_dn,
                                      MOTIVO_DATOS_INVALIDOS)
        dn = (f'{cfg.atributo_usuario}='
              f'{escapar_valor_dn(datos.identificador)},{cfg.usuarios_base_dn}')
        atributos = {
            ATRIBUTO_NOMBRE_COMPLETO: f'{datos.nombre} {datos.apellido}',
            ATRIBUTO_APELLIDO: datos.apellido,
            ATRIBUTO_NOMBRE: datos.nombre,
            ATRIBUTO_CORREO: datos.correo,
            cfg.atributo_usuario: datos.identificador,
        }
        # Sin `userPassword` en el alta: OpenLDAP lo guardaría tal cual (texto
        # claro). La contraseña va después con Password Modify, que el servidor
        # cifra (RFC 3062, ADR-008 5A, FNC-138).
        filtro = (f'({cfg.atributo_usuario}='
                  f'{escapar_filtro(datos.identificador)})')

        def alta_cuenta(conexion):
            try:
                conexion.search(cfg.usuarios_base_dn, filtro, SUBTREE,
                                attributes=[], size_limit=1)
            except LDAPSizeLimitExceededResult:
                return ResultadoEscritura(Resultado.YA_ESTABA, dn)
            if conexion.entries:
                return ResultadoEscritura(Resultado.YA_ESTABA,
                                          conexion.entries[0].entry_dn)
            try:
                conexion.add(dn, list(cfg.clases_usuario), atributos)
            except LDAPEntryAlreadyExistsResult:
                return ResultadoEscritura(Resultado.YA_ESTABA, dn)
            if datos.password:
                try:
                    motivo = _fijar_contrasena(conexion, dn, datos.password)
                except LDAPException:
                    self._retirar_entrada(conexion, dn)
                    raise
                if motivo:
                    self._retirar_entrada(conexion, dn)
                    return ResultadoEscritura(Resultado.ERROR_PERMANENTE, dn,
                                              motivo)
            return ResultadoEscritura(Resultado.HECHO, dn)

        return self._ejecutar('alta de cuenta', dn, alta_cuenta)

    @staticmethod
    def _retirar_entrada(conexion, dn):
        """Quita la entrada recién creada cuya contraseña no se pudo fijar
        (no queda una cuenta sin contraseña). Si tampoco se puede, queda para
        revisión; el log no lleva el DN (puede nombrar a la persona)."""
        try:
            conexion.delete(dn)
        except LDAPException:
            logger.error('Directorio: una cuenta recién creada quedó sin '
                         'contraseña y no se pudo retirar; revisar en el '
                         'directorio.')

    # ------------------------------------------------------------------ #
    # Baja de cuentas
    # ------------------------------------------------------------------ #

    def delete_user(self, user):
        """Elimina una cuenta en `LDAP_USERS_BASE_DN`."""
        usuario = self._normalizar_usuario(user)
        if not usuario or not getattr(usuario, 'dn', None):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, '',
                                      MOTIVO_DATOS_INCOMPLETOS)
        cfg = self.configuracion
        if not bajo_base(usuario.dn, cfg.usuarios_base_dn) or mismo_dn(usuario.dn, cfg.usuarios_base_dn):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, usuario.dn,
                                      MOTIVO_FUERA_DE_BASE)

        dn = usuario.dn

        def baja_cuenta(conexion):
            if not _existe(conexion, dn):
                return ResultadoEscritura(Resultado.NO_EXISTE, dn,
                                          MOTIVO_USUARIO_INEXISTENTE)
            try:
                conexion.delete(dn)
            except LDAPNoSuchObjectResult:
                return ResultadoEscritura(Resultado.NO_EXISTE, dn,
                                          MOTIVO_USUARIO_INEXISTENTE)
            return ResultadoEscritura(Resultado.HECHO, dn)

        return self._ejecutar('baja de cuenta', dn, baja_cuenta)

    # ------------------------------------------------------------------ #
    # Cambio de contraseña
    # ------------------------------------------------------------------ #

    def change_password(self, user, new_password, old_password=None):
        """Cambia la contraseña de una cuenta en `LDAP_USERS_BASE_DN` con
        Password Modify (el servidor la cifra; nunca `userPassword` en claro)."""
        if not new_password or not isinstance(new_password, str):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, '',
                                      MOTIVO_DATOS_INVALIDOS)
        usuario = self._normalizar_usuario(user)
        if not usuario or not getattr(usuario, 'dn', None):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, '',
                                      MOTIVO_DATOS_INCOMPLETOS)
        cfg = self.configuracion
        if not bajo_base(usuario.dn, cfg.usuarios_base_dn) or mismo_dn(usuario.dn, cfg.usuarios_base_dn):
            return ResultadoEscritura(Resultado.ERROR_PERMANENTE, usuario.dn,
                                      MOTIVO_FUERA_DE_BASE)

        dn = usuario.dn

        def modificar_clave(conexion):
            if not _existe(conexion, dn):
                return ResultadoEscritura(Resultado.NO_EXISTE, dn,
                                          MOTIVO_USUARIO_INEXISTENTE)
            if old_password:
                if not self.cliente.verificar_contrasena(usuario, old_password):
                    return ResultadoEscritura(Resultado.ERROR_PERMANENTE, dn,
                                              MOTIVO_DATOS_INVALIDOS)
            try:
                motivo = _fijar_contrasena(conexion, dn, new_password)
            except LDAPNoSuchObjectResult:
                return ResultadoEscritura(Resultado.NO_EXISTE, dn,
                                          MOTIVO_USUARIO_INEXISTENTE)
            if motivo:
                return ResultadoEscritura(Resultado.ERROR_PERMANENTE, dn,
                                          motivo)
            return ResultadoEscritura(Resultado.HECHO, dn)

        return self._ejecutar('cambio de contraseña', dn, modificar_clave)

    set_password = change_password
