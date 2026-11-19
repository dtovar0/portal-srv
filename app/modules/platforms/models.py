"""Traslado de los grupos LDAP de una plataforma inactiva (FNC-163, migración 0018).

- `platform_group_moves`: una fila por plataforma a la que alguna vez se le pidió
  mover sus grupos. Guarda dónde está **hoy** cada grupo (`activos` o
  `inactivos`), el estado del traslado (`pendiente`, `hecho`, `fallido`), los
  intentos del worker, el siguiente intento, la reserva y un código corto del
  último error (nunca texto del servidor).
- `Platform.ldap_group_*_dn` conserva siempre la ubicación **original** (así se
  regresa sin adivinar); el DN actual se calcula con `platforms/ubicacion_grupos.py`.
- Al borrar la plataforma se borra su fila (`ON DELETE CASCADE` y cascada del ORM).
- Fechas UTC sin zona (`provisioning.reloj.ahora`).
"""
from app import db
from app.modules.provisioning.reloj import ahora

AL_BORRAR_PLATAFORMA = 'CASCADE'
UBICACION_ACTIVOS = 'activos'
UBICACION_INACTIVOS = 'inactivos'
UBICACIONES = (UBICACION_ACTIVOS, UBICACION_INACTIVOS)
ESTADO_PENDIENTE = 'pendiente'
ESTADO_HECHO = 'hecho'
ESTADO_FALLIDO = 'fallido'
ESTADOS_TRASLADO = (ESTADO_PENDIENTE, ESTADO_HECHO, ESTADO_FALLIDO)
LARGO_UBICACION = 20
LARGO_ESTADO = 20
LARGO_ERROR = 100
LARGO_RESERVADO_POR = 100


class TrasladoGrupos(db.Model):
    __tablename__ = 'platform_group_moves'
    __table_args__ = (
        db.UniqueConstraint('platform_id',
                            name='uq_platform_group_moves_platform_id'),
        db.Index('ix_platform_group_moves_status_next', 'status',
                 'next_attempt_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    platform_id = db.Column(
        db.Integer,
        db.ForeignKey('platforms.id', name='fk_platform_group_moves_platform_id',
                      ondelete=AL_BORRAR_PLATAFORMA),
        nullable=False)
    # Dónde está hoy cada grupo (el de usuario y el de admin se mueven aparte).
    user_location = db.Column(db.String(LARGO_UBICACION), nullable=False,
                              default=UBICACION_ACTIVOS)
    admin_location = db.Column(db.String(LARGO_UBICACION), nullable=False,
                               default=UBICACION_ACTIVOS)
    status = db.Column(db.String(LARGO_ESTADO), nullable=False,
                       default=ESTADO_PENDIENTE)
    attempts_count = db.Column(db.Integer, nullable=False, default=0)
    max_attempts = db.Column(db.Integer, nullable=False)
    next_attempt_at = db.Column(db.DateTime, nullable=True)
    locked_at = db.Column(db.DateTime, nullable=True)
    locked_by = db.Column(db.String(LARGO_RESERVADO_POR), nullable=True)
    last_error = db.Column(db.String(LARGO_ERROR), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=ahora)
    updated_at = db.Column(db.DateTime, nullable=False, default=ahora,
                           onupdate=ahora)

    plataforma = db.relationship(
        'Platform', backref=db.backref('group_move', uselist=False,
                                       lazy='joined',
                                       cascade='all, delete-orphan',
                                       passive_deletes=True))

    def ubicacion(self, nivel):
        return self.admin_location if nivel == 'admin' else self.user_location

    def __repr__(self):
        return f'<TrasladoGrupos {self.id} {self.status}>'
