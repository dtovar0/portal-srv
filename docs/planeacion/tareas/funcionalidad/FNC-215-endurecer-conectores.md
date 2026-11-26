# FNC-215 — Conectores: observaciones Bajas de seguridad de FNC-213

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26): «haz los puntos menores» (4 Bajas del auditor de seguridad en FNC-213). Web en DIS-143.

## Cambios
- Asociar a un destino con accesos vigentes: `409 plataforma_destino_con_accesos` con `accesos_vigentes` salvo `confirmar: true`; `conector_asociado` guarda `accesos_vigentes_destino`. Contrato conectores 1.7.
- TOCTOU: `platforms/estado.bloquear_plataforma` (`SELECT ... FOR UPDATE`) antes de contar accesos en conectores (rutas por conector y por plataforma), en la baja de plataforma y al inicio de `access.services.otorgar`.
- Baja de plataforma: `conector_desasociado` por cada conector que queda libre.

## Decisiones
- `credential_ref` sin único en BD: compartir la misma referencia entre conectores está permitido (FNC-061); el chequeo con carrera solo compara referencias distintas que caen en la misma variable de entorno, lo que pasa en desarrollo. Se documenta y no se cambia.
- SQLite ignora `FOR UPDATE` (un escritor); el bloqueo aplica en MySQL y PostgreSQL.

## Pruebas
- `tests/connectors/test_endurecimiento_fnc215.py` (11; fallaban sin el cambio). connectors, platforms, access y access_requests: 1100 passed.
