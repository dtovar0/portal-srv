"""Configuración de los conectores (FNC-050, migración 0009; FNC-213, 0024).

- `platform_connectors`: un conector tiene `name` y puede existir **sin
  plataforma** (`platform_id` nulo) hasta que se asocia; una plataforma tiene
  a lo más uno (`platform_id` único; varios `NULL` caben en MySQL,
  PostgreSQL y SQLite). Tipo, host por nombre
  (lista blanca, SEC-CON-07), puerto, parámetros no sensibles validados por el
  esquema del tipo y la **referencia** al ítem del gestor de secretos
  (ADR-005). Ninguna columna guarda el valor de una credencial (SEC-CON-02).
- Cambiar `host` o `credential_ref` deja `credential_status` en
  `sin_verificar` (SEC-CON-07).
- Al borrar la plataforma el conector queda sin asociar (`ON DELETE SET NULL`).
- `name_norm` (`name.casefold()`, mantenido por `name`) tiene la restricción
  única: es la forma portable de «único sin distinguir mayúsculas», porque
  MySQL lo hace por colación pero PostgreSQL y SQLite no, y un índice sobre
  `lower(name)` no existe igual en los tres.
- Fechas UTC sin zona (`provisioning.reloj.ahora`).
"""
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import validates

from app import db
from app.modules.connectors.tipos import (CREDENCIAL_SIN_VERIFICAR,
                                          LARGO_CLAVE_NOMBRE,
                                          LARGO_ESTADO_CREDENCIAL, LARGO_HOST,
                                          LARGO_NOMBRE, LARGO_REFERENCIA,
                                          LARGO_TIPO)
from app.modules.provisioning.reloj import ahora

AL_BORRAR_PLATAFORMA = 'SET NULL'
FORMATO_FECHA = '%Y-%m-%dT%H:%M:%SZ'
# Cambiarlos invalida la verificación de la credencial.
CAMPOS_QUE_INVALIDAN = ('host', 'credential_ref')


# MySQL: el único de `name_norm` compara exacto (FNC-213).
COLACION_EXACTA_MYSQL = 'utf8mb4_bin'


class PlatformConnector(db.Model):
    __tablename__ = 'platform_connectors'
    __table_args__ = (
        db.UniqueConstraint('platform_id',
                            name='uq_platform_connectors_platform_id'),
        db.UniqueConstraint('name_norm',
                            name='uq_platform_connectors_name_norm'),
    )

    id = db.Column(db.Integer, primary_key=True)
    platform_id = db.Column(
        db.Integer,
        db.ForeignKey('platforms.id', name='fk_platform_connectors_platform_id',
                      ondelete=AL_BORRAR_PLATAFORMA),
        nullable=True)
    name = db.Column(db.String(LARGO_NOMBRE), nullable=False)
    # MySQL: comparación exacta (la colación por omisión ignora acentos), como en
    # PostgreSQL y SQLite; la migración 0024 usa el mismo tipo.
    name_norm = db.Column(
        db.String(LARGO_CLAVE_NOMBRE).with_variant(
            mysql.VARCHAR(LARGO_CLAVE_NOMBRE, collation=COLACION_EXACTA_MYSQL),
            'mysql'),
        nullable=False)
    type = db.Column(db.String(LARGO_TIPO), nullable=False)
    host = db.Column(db.String(LARGO_HOST), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    params = db.Column(db.JSON, nullable=False, default=dict)
    credential_ref = db.Column(db.String(LARGO_REFERENCIA), nullable=False)
    credential_status = db.Column(db.String(LARGO_ESTADO_CREDENCIAL),
                                  nullable=False,
                                  default=CREDENCIAL_SIN_VERIFICAR)
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=ahora)
    updated_at = db.Column(db.DateTime, nullable=False, default=ahora,
                           onupdate=ahora)

    # Solo lectura: se asocia con `platform_id`.
    platform = db.relationship('Platform', lazy='joined', viewonly=True)

    @staticmethod
    def clave_de(nombre):
        """Clave de unicidad sin distinguir mayúsculas."""
        return nombre.casefold()

    @validates('name')
    def _calcular_clave(self, _campo, valor):
        self.name_norm = self.clave_de(valor)
        return valor

    @validates(*CAMPOS_QUE_INVALIDAN)
    def _invalidar_verificacion(self, campo, valor):
        if getattr(self, campo) is not None and getattr(self, campo) != valor:
            self.credential_status = CREDENCIAL_SIN_VERIFICAR
        return valor

    def to_dict(self):
        """Forma `Connector` del contrato; nunca el valor de la credencial."""
        return {
            'id': self.id,
            'name': self.name,
            'platform_id': self.platform_id,
            'type': self.type,
            'host': self.host,
            'port': self.port,
            'params': dict(self.params or {}),
            'credential_ref': self.credential_ref,
            'credential_status': self.credential_status,
            'active': self.active,
            'updated_at': (self.updated_at.strftime(FORMATO_FECHA)
                           if self.updated_at else None),
        }

    def to_dict_v2(self):
        """Forma `ConnectorV2` (v1.6): `Connector` más la plataforma."""
        datos = self.to_dict()
        plataforma = self.platform if self.platform_id else None
        datos['platform'] = None if plataforma is None else {
            'id': plataforma.id, 'name': plataforma.name,
            'area_id': plataforma.area_id,
            'area': plataforma.area.name if plataforma.area else None}
        return datos
