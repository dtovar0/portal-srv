"""Módulo de Autoservicio de Contraseñas e Identidad Authelia.

Permite a los usuarios corporativos:
1. Cambiar su contraseña conociendo su contraseña actual (o si expiró).
2. Solicitar un enlace o código de recuperación por correo.
3. Verificar segundo factor (MFA) por código de correo de 6 dígitos o Authenticator (TOTP).
4. Restablecer su contraseña con sincronización atómica a OpenLDAP y JumpServer.

Este módulo solo contiene las operaciones. Desde FNC-174 el resto vive en
módulos de una responsabilidad (se re-exportan aquí los nombres públicos):
- `autoservicio_errores`: `ErrorAutoservicio`.
- `autoservicio_config`: variables de entorno, política y configuración.
- `autoservicio_correo`: SMTP y los tres correos.
- `autoservicio_mfa`: tokens firmados, código MFA y TOTP.
- `autoservicio_externos`: sincronización con JumpServer.
- `autoservicio_cuentas`: cuenta del portal (FNC-168).

Reglas:
- Identidad visual y comunicacional de Authelia para garantizar coherencia en el flujo SSO.
- La contraseña nunca se registra en texto plano ni se expone en logs.
- Valida estrictamente la política corporativa de contraseñas.
- Protegido contra ataques de fuerza bruta mediante auditoría y límites de intentos.
"""
import logging
from urllib.parse import urlencode

from app import db
from app.modules.audit.services import add_audit_log
from app.modules.auth.autoservicio_config import (  # noqa: F401 (re-exportados)
    mfa_habilitado, obtener_configuracion_autoservicio,
    obtener_politica_contrasena, tiempo_expiracion_mfa, tipo_mfa)
from app.modules.auth.autoservicio_correo import (  # noqa: F401 (re-exportados)
    enviar_correo_confirmacion_cambio, enviar_correo_mfa,
    enviar_correo_recuperacion, resolver_smtp_autoservicio)
from app.modules.auth.autoservicio_cuentas import (cuenta_dada_de_alta,
                                                  cuenta_del_portal,
                                                  cuenta_local,
                                                  sincronizar_cuenta_local)
from app.modules.auth.autoservicio_errores import ErrorAutoservicio
from app.modules.auth.autoservicio_externos import sincronizar_jumpserver_o_externos
from app.modules.auth.autoservicio_mfa import (  # noqa: F401 (re-exportados)
    SALT_MFA, SALT_RECUPERACION, TOKEN_MAX_AGE_SEGUNDOS,
    generar_token_recuperacion, solicitar_codigo_mfa, validar_desafio_mfa,
    verificar_codigo_mfa_paso2, verificar_codigo_totp,
    verificar_token_recuperacion)
from app.modules.auth.limite_intentos import bloqueado
from app.modules.directory.configuracion import directorio_activo
from app.modules.directory.ldap_client import ClienteDirectorio
from app.modules.directory.writer import EscritorDirectorio
from app.modules.users.entrega_credenciales import url_del_portal
from app.modules.users.politica_contrasena import mensaje_de_incumplimiento

logger = logging.getLogger(__name__)

RUTA_AUTOSERVICIO = '/autoservicio'
# Respuesta única (exista o no la cuenta): no revela qué correos existen.
RESPUESTA_RECUPERACION = {
    'status': 'success',
    'message': 'Si tu cuenta existe en Authelia, recibirás un correo con las instrucciones.',
}


# FNC-176: respuesta cuando el MFA está apagado y se pide el restablecimiento directo.
MENSAJE_SIN_MFA_DIRECTO = ('El restablecimiento sin contraseña requiere el segundo '
                           'factor, que no está activado. Usa «¿Olvidaste tu '
                           'contraseña?» para recibir un enlace por correo.')

def cambiar_contrasena(identificador, contrasena_actual, nueva_contrasena, mfa_code=None, challenge_token=None):
    """Cambia la contraseña validando la contraseña actual y segundo factor MFA si aplica."""
    identificador = (identificador or '').strip()
    if not identificador or not contrasena_actual or not nueva_contrasena:
        raise ErrorAutoservicio('Debes indicar tu usuario/correo, contraseña actual y nueva contraseña.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos fallidos. Intenta más tarde.', 429)

    # Validar MFA si está habilitado
    if mfa_habilitado():
        validar_desafio_mfa(identificador, mfa_code, challenge_token)

    msg_politica = mensaje_de_incumplimiento(nueva_contrasena)
    if msg_politica:
        raise ErrorAutoservicio(msg_politica, 400)

    # 1. Búsqueda en OpenLDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_usuario(identificador)
            if not persona and '@' in identificador:
                persona = cliente.buscar_usuario(identificador.split('@')[0])
            if persona and persona.dn:
                # Verificar clave actual contra LDAP
                if not cliente.verificar_contrasena(persona, contrasena_actual):
                    add_audit_log('ACCESO FALLIDO', status='error', target=identificador,
                                  detail='Autoservicio Authelia: contraseña actual incorrecta en LDAP')
                    raise ErrorAutoservicio('La contraseña actual es incorrecta.', 401)
                _exigir_alta_en_portal(persona.correo, identificador)

                # Modificar en LDAP
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                logger.info("Autoservicio: Cambio de contraseña LDAP para %s (DN: %s) -> exito=%s, motivo=%s",
                            identificador, persona.dn, resultado.exito, resultado.motivo)
                if not resultado.exito:
                    raise ErrorAutoservicio(f'El directorio no pudo aplicar la nueva contraseña ({resultado.motivo or "error"}).', 500)

                # Hook de sincronización JumpServer
                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)

                # Solo una cuenta local guarda la contraseña en la BD (FNC-168).
                sincronizar_cuenta_local(identificador, nueva_contrasena)

                # Notificación por correo confirmando la actualización
                destinatario_correo = persona.correo or (identificador if '@' in identificador else None)
                if destinatario_correo:
                    enviar_correo_confirmacion_cambio(destinatario_correo, nombre=persona.nombre)

                add_audit_log('AUTOSERVICIO: PASSWORD ACTUALIZADO POR USUARIO', module='Autoservicio', status='success',
                              target=persona.identificador, user_override=identificador,
                              detail='Contraseña actualizada por el propio usuario en OpenLDAP mediante portal de autoservicio Authelia')
                return {'status': 'success', 'message': 'Contraseña actualizada con éxito en Authelia y el directorio corporativo.'}
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error cambiando contraseña en LDAP (%s): %s", identificador, type(exc).__name__)
            raise ErrorAutoservicio('Error al comunicarse con el directorio corporativo (LDAP).', 500)

    # 2. Cuenta local del portal (las del directorio solo cambian en LDAP).
    user = cuenta_local(identificador)

    if user and user.password_hash and user.check_password(contrasena_actual):
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)

        # Notificación por correo confirmando la actualización
        enviar_correo_confirmacion_cambio(user.email, nombre=user.nombre)

        add_audit_log('AUTOSERVICIO: PASSWORD ACTUALIZADO POR USUARIO', module='Autoservicio', status='success',
                      target=user.email, user_override=identificador,
                      detail='Contraseña actualizada por el propio usuario en BD local mediante portal de autoservicio Authelia')
        return {'status': 'success', 'message': 'Contraseña actualizada con éxito en Authelia.'}

    add_audit_log('ACCESO FALLIDO', status='error', target=identificador,
                  detail='Autoservicio Authelia: credenciales no válidas')
    raise ErrorAutoservicio('Credenciales actuales incorrectas o cuenta inexistente.', 401)



def solicitar_recuperacion(correo):
    """Envía el enlace de recuperación si la cuenta existe."""
    correo = (correo or '').strip().lower()
    if not correo or '@' not in correo:
        raise ErrorAutoservicio('Ingresa una dirección de correo válida.', 400)

    if bloqueado(correo):
        raise ErrorAutoservicio('Límite de solicitudes alcanzado. Espera unos minutos.', 429)

    nombre = None
    existe = False

    # Verificar en LDAP
    if directorio_activo():
        try:
            persona = ClienteDirectorio().buscar_por_correo(correo)
            if persona:
                existe = True
                nombre = persona.nombre
        except Exception:
            pass

    # Verificar en BD local
    if not existe:
        user = cuenta_local(correo)
        if user:
            existe = True
            nombre = user.nombre or user.email

    # FNC-181: solo cuentas dadas de alta (y activas) en el portal; misma
    # respuesta que si no existiera (sin enumeración).
    if existe and cuenta_dada_de_alta(correo) is None:
        logger.info('Autoservicio: recuperación pedida para una persona sin alta '
                    'en el portal; no se envía enlace.')
        existe = False

    if existe:
        origen = url_del_portal()
        if not origen:
            logger.error('Autoservicio: BASE_URL no configurada; no se envía '
                         'el enlace de recuperación.')
            return RESPUESTA_RECUPERACION
        token = generar_token_recuperacion(correo)
        consulta = urlencode({'token': token, 'email': correo})
        enlace = f"{origen}{RUTA_AUTOSERVICIO}?{consulta}"

        enviar_correo_recuperacion(correo, enlace, nombre=nombre)

        add_audit_log('AUTOSERVICIO: RECUPERACION SOLICITADA', status='info', target=correo,
                      detail='Authelia: enlace de recuperación generado')

    return RESPUESTA_RECUPERACION


# FNC-179: por qué no se pudo restablecer (la identidad ya se verificó con el
# enlace o el MFA, así que el motivo concreto no revela cuentas ajenas).
MENSAJE_DIRECTORIO_INACTIVO = ('El directorio corporativo (LDAP) no está configurado '
                               'en el portal. Avisa al administrador.')
MENSAJE_NO_EN_DIRECTORIO = ('Tu cuenta no está en el directorio corporativo (LDAP). '
                            'Avisa al administrador.')
MENSAJE_CUENTA_INEXISTENTE = 'No se encontró la cuenta de usuario especificada.'


MENSAJE_SIN_ALTA = ('Tu cuenta no está dada de alta en el portal, así que no puedes '
                    'cambiar tu contraseña aquí. Avisa al administrador.')


def _exigir_alta_en_portal(*identificadores):
    """FNC-181: la persona está en LDAP, pero solo cambia su contraseña aquí
    si tiene cuenta activa en el portal. Se llama tras verificar la identidad
    (contraseña actual, enlace o MFA)."""
    if cuenta_dada_de_alta(*identificadores) is None:
        logger.warning('Autoservicio: cambio rechazado, la persona no está dada '
                       'de alta en el portal.')
        raise ErrorAutoservicio(MENSAJE_SIN_ALTA, 403)


def _sin_cuenta(identificador):
    """Error cuando ni LDAP ni una cuenta local del portal tienen la cuenta."""
    cuenta = cuenta_del_portal(identificador)
    if cuenta is None:
        return ErrorAutoservicio(MENSAJE_CUENTA_INEXISTENTE, 404)
    if not directorio_activo():
        logger.error('Autoservicio: cuenta del directorio sin LDAP configurado '
                     '(LDAP_URL vacía o directorio inactivo).')
        return ErrorAutoservicio(MENSAJE_DIRECTORIO_INACTIVO, 503)
    logger.warning('Autoservicio: la cuenta del portal no está en LDAP_USERS_BASE_DN '
                   '(se buscó por correo y por usuario).')
    return ErrorAutoservicio(MENSAJE_NO_EN_DIRECTORIO, 404)


def restablecer_con_token(correo, token, nueva_contrasena, mfa_code=None, challenge_token=None):
    """Aplica la nueva contraseña utilizando el token firmado y segundo factor MFA si aplica."""
    correo = (correo or '').strip().lower()
    token = (token or '').strip()
    if not token or not nueva_contrasena:
        raise ErrorAutoservicio('Token y nueva contraseña son obligatorios.', 400)

    token_email = verificar_token_recuperacion(token)
    if correo and token_email != correo:
        raise ErrorAutoservicio('El correo no coincide con el token de recuperación.', 400)

    correo_objetivo = token_email

    # Validar MFA si está habilitado
    if mfa_habilitado():
        validar_desafio_mfa(correo_objetivo, mfa_code, challenge_token)

    msg_politica = mensaje_de_incumplimiento(nueva_contrasena)
    if msg_politica:
        raise ErrorAutoservicio(msg_politica, 400)

    # Actualizar en LDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(correo_objetivo)
            if not persona and '@' in correo_objetivo:
                persona = cliente.buscar_usuario(correo_objetivo.split('@')[0])
            if persona and persona.dn:
                _exigir_alta_en_portal(persona.correo, correo_objetivo)
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                logger.info("Autoservicio: Restablecimiento con token LDAP para %s (DN: %s) -> exito=%s, motivo=%s",
                            correo_objetivo, persona.dn, resultado.exito, resultado.motivo)
                if not resultado.exito:
                    raise ErrorAutoservicio(f'El directorio no pudo actualizar la contraseña ({resultado.motivo or "error"}).', 500)
                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)

                # Solo una cuenta local guarda la contraseña en la BD (FNC-168).
                sincronizar_cuenta_local(correo_objetivo, nueva_contrasena)

                # Notificación por correo confirmando el restablecimiento
                enviar_correo_confirmacion_cambio(correo_objetivo, nombre=persona.nombre)

                add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO', module='Autoservicio', status='success',
                              target=correo_objetivo, user_override=correo_objetivo,
                              detail='Contraseña restablecida por el usuario en OpenLDAP mediante enlace temporal y MFA de Authelia')
                return {'status': 'success', 'message': 'Contraseña restablecida exitosamente en Authelia.'}
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error restableciendo contraseña en LDAP: %s", type(exc).__name__)
            raise ErrorAutoservicio('Error al comunicarse con el directorio corporativo (LDAP).', 500)

    # Cuenta local del portal (las del directorio solo cambian en LDAP).
    user = cuenta_local(correo_objetivo)
    if user:
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)

        # Notificación por correo confirmando el restablecimiento
        enviar_correo_confirmacion_cambio(correo_objetivo, nombre=user.nombre)

        add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO', module='Autoservicio', status='success',
                      target=correo_objetivo, user_override=correo_objetivo,
                      detail='Contraseña restablecida por el usuario en BD local mediante enlace temporal y MFA de Authelia')
        return {'status': 'success', 'message': 'Contraseña restablecida exitosamente en Authelia.'}

    raise _sin_cuenta(correo_objetivo)


def restablecer_directo_mfa(identificador, nueva_contrasena, mfa_code, challenge_token=None):
    """Restablece la contraseña directamente validando el segundo factor (MFA)
    sin requerir contraseña previa ni enlace por correo.
    Especialmente diseñado para usuarios con contraseña caducada o sin acceso inicial."""
    identificador = (identificador or '').strip()
    nueva_contrasena = (nueva_contrasena or '').strip()
    mfa_code = (mfa_code or '').strip()

    if not identificador or not nueva_contrasena:
        raise ErrorAutoservicio('Debes indicar tu usuario/correo y la nueva contraseña.', 400)

    if bloqueado(identificador):
        raise ErrorAutoservicio('Has superado el límite de intentos fallidos. Intenta más tarde.', 429)

    # FNC-176: sin contraseña previa ni enlace, el segundo factor es lo único
    # que prueba la identidad; con MFA apagado no hay restablecimiento directo.
    if not mfa_habilitado():
        raise ErrorAutoservicio(MENSAJE_SIN_MFA_DIRECTO, 403)

    # El reseteo directo sin clave previa exige validar MFA
    if not mfa_code:
        raise ErrorAutoservicio('Se requiere el código de segundo factor (MFA) para restablecer la contraseña.', 400)

    validar_desafio_mfa(identificador, mfa_code, challenge_token)

    msg_politica = mensaje_de_incumplimiento(nueva_contrasena)
    if msg_politica:
        raise ErrorAutoservicio(msg_politica, 400)

    # 1. OpenLDAP
    if directorio_activo():
        try:
            cliente = ClienteDirectorio()
            persona = cliente.buscar_por_correo(identificador) if '@' in identificador else cliente.buscar_usuario(identificador)
            if not persona and '@' in identificador:
                persona = cliente.buscar_usuario(identificador.split('@')[0])
            if persona and persona.dn:
                _exigir_alta_en_portal(persona.correo, identificador)
                escritor = EscritorDirectorio(cliente)
                resultado = escritor.change_password(persona.dn, nueva_contrasena)
                logger.info("Autoservicio MFA: Restablecimiento en LDAP para %s (DN: %s) -> exito=%s, motivo=%s",
                            identificador, persona.dn, resultado.exito, resultado.motivo)
                if not resultado.exito:
                    raise ErrorAutoservicio(f'El directorio no pudo aplicar la nueva contraseña ({resultado.motivo or "error"}).', 500)

                sincronizar_jumpserver_o_externos(persona.identificador, nueva_contrasena)

                # Solo una cuenta local guarda la contraseña en la BD (FNC-168).
                sincronizar_cuenta_local(identificador, nueva_contrasena)

                destinatario_correo = persona.correo or (identificador if '@' in identificador else None)
                if destinatario_correo:
                    enviar_correo_confirmacion_cambio(destinatario_correo, nombre=persona.nombre)

                add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO (MFA)', module='Autoservicio', status='success',
                              target=persona.identificador, user_override=identificador,
                              detail='Contraseña restablecida directamente con MFA por el usuario en Autoservicio Authelia')
                return {'status': 'success', 'message': 'Contraseña restablecida con éxito en Authelia y el directorio corporativo.'}
            else:
                logger.warning("Autoservicio MFA: Usuario '%s' no encontrado en LDAP a pesar de que el directorio está activo", identificador)
        except ErrorAutoservicio:
            raise
        except Exception as exc:
            logger.error("Error restableciendo contraseña con MFA en LDAP (%s): %s", identificador, type(exc).__name__)
            raise ErrorAutoservicio('Error al comunicarse con el directorio corporativo (LDAP).', 500)

    # 2. Cuenta local del portal (las del directorio solo cambian en LDAP).
    user = cuenta_local(identificador)
    if user:
        user.set_password(nueva_contrasena)
        db.session.commit()
        sincronizar_jumpserver_o_externos(user.email, nueva_contrasena)
        enviar_correo_confirmacion_cambio(user.email, nombre=user.nombre)
        add_audit_log('AUTOSERVICIO: PASSWORD RESTABLECIDO POR USUARIO (MFA)', module='Autoservicio', status='success',
                      target=user.email, user_override=identificador,
                      detail='Contraseña local restablecida directamente con MFA en Autoservicio Authelia')
        return {'status': 'success', 'message': 'Contraseña restablecida con éxito en Authelia.'}

    raise _sin_cuenta(identificador)
