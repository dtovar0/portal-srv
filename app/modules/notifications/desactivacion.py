"""Aviso a quienes tienen acceso cuando se desactiva una plataforma o un área
(FNC-210).

- Se llama **después del commit** del cambio de estado, dentro de `try` en el
  llamador; nunca lanza (`_sin_excepciones`).
- Destinatarios: cuentas activas con acceso vigente (`activo` o `en_proceso`)
  a las plataformas afectadas y con `pref_email_notifications` encendida.
- Un correo por persona; si el área trae varias plataformas, `plataforma` las
  lista separadas por coma (solo las que esa persona tiene).
- Interruptor propio `NOTIFY_PLATFORM_DEACTIVATION` (por omisión `true`);
  `ENABLE_NOTIFICATIONS=false` también lo corta. Reactivar no avisa.
"""
from collections import OrderedDict

from app import db
from app.modules.access.models import PlatformAccessGrant
from app.modules.access.tipos import ESTADO_ACTIVO, ESTADO_EN_PROCESO
from app.modules.auth.models import User
from app.modules.notifications import access_notifications as base

SLUG = 'plataforma_desactivada'
VARIABLE_INTERRUPTOR = 'NOTIFY_PLATFORM_DEACTIVATION'
ESTADOS_CON_ACCESO = (ESTADO_ACTIVO, ESTADO_EN_PROCESO)
ESTADO_INACTIVO = 'Inactivo'
SEPARADOR_PLATAFORMAS = ', '


def esta_activa(plataforma):
    """Plataforma y área activas (con el área inactiva ya se avisó antes)."""
    area = plataforma.area
    return (plataforma.status != ESTADO_INACTIVO
            and (area is None or area.status != ESTADO_INACTIVO))


def _plataformas_por_persona(plataformas):
    """`{usuario: [nombres]}` de las cuentas con acceso vigente."""
    por_id = {p.id: p for p in plataformas}
    if not por_id:
        return OrderedDict()
    accesos = (PlatformAccessGrant.query
               .filter(PlatformAccessGrant.platform_id.in_(list(por_id)),
                       PlatformAccessGrant.status.in_(ESTADOS_CON_ACCESO))
               .order_by(PlatformAccessGrant.user_id,
                         PlatformAccessGrant.platform_id).all())
    personas = OrderedDict()
    for acceso in accesos:
        nombre = por_id[acceso.platform_id].name
        lista = personas.setdefault(acceso.user_id, [])
        if nombre not in lista:
            lista.append(nombre)
    return personas


@base._sin_excepciones
def notificar_plataformas_desactivadas(plataformas, area):
    """Avisa a cada persona con acceso a alguna de `plataformas` (de `area`).

    Devuelve `{'status': ..., 'recipients': n}` (personas con correo enviado).
    """
    if not base.avisos_activos(VARIABLE_INTERRUPTOR):
        return {'status': base.OMITIDO, 'recipients': 0}
    if area is None:
        raise base.DatosIncompletos('plataforma sin área')
    enviados = 0
    for usuario_id, nombres in _plataformas_por_persona(plataformas).items():
        usuario = db.session.get(User, usuario_id)
        if (usuario is None or not usuario.is_active
                or not base._quiere_correo(usuario, True)):
            continue
        destinatarios = base.correos([usuario])
        # Lista blanca de la plantilla (SEC-MAIL-02): solo estas cuatro claves.
        contexto = {'nombre': base._nombre(usuario),
                    'plataforma': SEPARADOR_PLATAFORMAS.join(nombres),
                    'area': area.name, 'url': base._url_portal()}
        resultado = base._enviar(
            SLUG, destinatarios, contexto,
            area_id=area.id, target_user_id=usuario.id,
            platform_id=plataformas[0].id if len(plataformas) == 1 else None,
            interruptor=VARIABLE_INTERRUPTOR)
        if resultado['status'] == base.ENVIADO:
            enviados += resultado['recipients']
    return {'status': base.ENVIADO if enviados else base.OMITIDO,
            'recipients': enviados}
