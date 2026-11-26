"""Estado de una plataforma que aportan otras tareas (puntos de extensión).

- `accesos_vigentes`: accesos otorgados vigentes (FNC-054; definición en
  `docs/contratos/accesos.md`). Con más de 0, `409 plataforma_con_accesos`
  (FNC-046).
- `accesos_que_impiden_mover`: los mismos sin los automáticos de los admins
  (`admin_de_area`), que se resincronizan al cambiar el área (FNC-055).
- `bloquear_plataforma`: `SELECT ... FOR UPDATE` antes de contar accesos o
  crear uno (FNC-215).
- `tiene_conector`: configuración activa del conector de un tipo registrado
  (FNC-050, `connectors.consultas.conector_disponible`).

Quien la implemente cambia solo esta función: `to_dict` y las validaciones de
`api.py` ya la usan.
"""


def accesos_vigentes(plataforma):
    """Accesos vigentes de la plataforma (FNC-054)."""
    # Import diferido: `core.models` importa este módulo al cargarse.
    from app.modules.access.consultas import contar_vigentes_de_plataforma
    return contar_vigentes_de_plataforma(getattr(plataforma, 'id', None))


def accesos_que_impiden_mover(plataforma):
    """Vigentes que impiden cambiar el área: todos menos `admin_de_area`."""
    from app.modules.access.consultas import contar_vigentes_no_automaticos
    return contar_vigentes_no_automaticos(getattr(plataforma, 'id', None))


def tiene_conector(plataforma):
    """`True` si la plataforma `conector` tiene una configuración activa de un
    tipo registrado (FNC-050)."""
    from app.modules.connectors.consultas import conector_disponible
    return conector_disponible(plataforma)


def consulta_bloqueo(plataforma_id):
    """`SELECT id ... FOR UPDATE` de la plataforma (FNC-215)."""
    from sqlalchemy import select
    from app.modules.core.models import Platform
    return (select(Platform.id).where(Platform.id == plataforma_id)
            .with_for_update())


def bloquear_plataforma(plataforma_id):
    """Bloquea la fila de la plataforma hasta el `commit` (FNC-215, TOCTOU).

    Quien cuenta accesos vigentes para decidir (conectores, baja) y quien crea
    un acceso (`otorgar`) pasan por aquí: no se cuela un acceso entre la
    cuenta y el cambio. MySQL y PostgreSQL bloquean; SQLite lo ignora (un
    solo escritor). Se llama por el módulo (`estado.bloquear_plataforma`).
    """
    if not plataforma_id:
        return
    from app import db
    db.session.execute(consulta_bloqueo(plataforma_id))
