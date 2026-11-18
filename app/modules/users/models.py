"""Entrega de las credenciales iniciales de una cuenta (FNC-138, migración 0014).

- `credential_deliveries`: una fila por cuenta dada de alta desde el portal.
  Guarda el estado (`pendientes` o `enviadas`), los intentos del reintento
  (mismo worker y cola RQ que los accesos, ADR-008 3B), el siguiente intento,
  la reserva del worker y el id del último Send (no es secreto: no permite leer
  su contenido).
- **Nunca** guarda la contraseña, el enlace del Send ni su llave (ADR-008 2d);
  `last_error` es un código corto del catálogo de `entrega_credenciales.py`.
- Al borrar la cuenta se borra su fila (`ON DELETE CASCADE` y cascada del ORM).
- Fechas UTC sin zona (`provisioning.reloj.ahora`).
"""
from app import db
from app.modules.provisioning.reloj import ahora

AL_BORRAR_CUENTA = 'CASCADE'
ESTADO_PENDIENTES = 'pendientes'
ESTADO_ENVIADAS = 'enviadas'
ESTADOS_CREDENCIALES = (ESTADO_PENDIENTES, ESTADO_ENVIADAS)
LARGO_ESTADO = 20
LARGO_UID = 64
LARGO_SEND_ID = 64
LARGO_ERROR = 100
LARGO_RESERVADO_POR = 100


class EntregaCredenciales(db.Model):
    __tablename__ = 'credential_deliveries'
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uq_credential_deliveries_user_id'),
        db.Index('ix_credential_deliveries_status_next', 'status',
                 'next_attempt_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', name='fk_credential_deliveries_user_id',
                      ondelete=AL_BORRAR_CUENTA),
        nullable=False)
    # Identificador de la cuenta en el directorio (no es secreto).
    uid = db.Column(db.String(LARGO_UID), nullable=False)
    status = db.Column(db.String(LARGO_ESTADO), nullable=False,
                       default=ESTADO_PENDIENTES)
    attempts_count = db.Column(db.Integer, nullable=False, default=0)
    max_attempts = db.Column(db.Integer, nullable=False)
    next_attempt_at = db.Column(db.DateTime, nullable=True)
    locked_at = db.Column(db.DateTime, nullable=True)
    locked_by = db.Column(db.String(LARGO_RESERVADO_POR), nullable=True)
    send_id = db.Column(db.String(LARGO_SEND_ID), nullable=True)
    last_sent_at = db.Column(db.DateTime, nullable=True)
    last_error = db.Column(db.String(LARGO_ERROR), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=ahora)
    updated_at = db.Column(db.DateTime, nullable=False, default=ahora,
                           onupdate=ahora)

    # Una cuenta tiene a lo más una entrega; se carga con la cuenta para que
    # las listas no hagan una consulta por fila.
    cuenta = db.relationship(
        'User', backref=db.backref('credential_delivery', uselist=False,
                                   lazy='joined',
                                   cascade='all, delete-orphan',
                                   passive_deletes=True))

    def __repr__(self):
        return f'<EntregaCredenciales {self.id} {self.status}>'
