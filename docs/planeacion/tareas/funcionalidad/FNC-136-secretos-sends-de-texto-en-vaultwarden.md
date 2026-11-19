# FNC-136 — Secretos: crear y borrar Sends de texto en Vaultwarden

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Agente** | desarrollador |
| **Fase** | 8 (propuesta) |
| **Módulo / Área** | secretos |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Responsable** | |
| **Creada** | 2026-11-17 |
| **Inicio** | 2026-11-18 |
| **Finalizada** | 2026-11-18 |
| **Estatus Git** | Rama local, sin merge ni push |
| **Rama** | `fnc/FNC-136-sends-vaultwarden` |
| **Commits / PR** | |
| **Requiere migración BD** | No |
| **Requiere auditor-seguridad** | Sí (cifrado, secretos) |

## Contexto
- `app/modules/secretos/vaultwarden.py`: cliente de **solo lectura** (ADR-005, FNC-068); ya abre sesión y obtiene la clave de usuario (`_abrir_claves`).
- `app/modules/secretos/cifrado.py`: solo **descifra** tipo 2; no cifra ni hace HKDF con extracción.
- ADR-008 pide Sends de texto creados desde el portal.

## Objetivo
- `crear_send_texto(nombre, texto, caducidad, max_aperturas, borrado)` → `(id, enlace)` y `borrar_send(id)`, con cifrado del lado del cliente.

## Alcance
- **Incluye:**
  - `cifrado.py`: `cifrar_simetrico` tipo 2 (IV aleatorio, AES-256-CBC + HMAC-SHA256) y derivación de la llave del Send: 16 bytes aleatorios → HKDF-SHA256 (sal `bitwarden-send`, info `send`, 64 bytes) → `enc`/`mac`.
  - Send: `name` y `text.text` cifrados con la llave derivada; `key` = llave del Send cifrada con la **clave de usuario**; `text.hidden=true`; `hideEmail=true`; `maxAccessCount`, `expirationDate`, `deletionDate` de variables.
  - `POST /api/sends`, `DELETE /api/sends/<id>`; enlace `<base>/#/send/<accessId>/<llave en base64url>`.
  - Mismas reglas del cliente: https, TLS validado, sin redirecciones, errores sin valores, `GestorCaido` (transitorio) vs `GestorMalConfigurado` (permanente); 4xx de política «Deshabilitar Send» → permanente con motivo propio.
  - Docstrings de `secretos/__init__.py` y `vaultwarden.py` (ya no es solo lectura); `docs/operacion/SECRETOS.md` (Sends, política de la organización, alcance de red).
- **No incluye:** el flujo de onboarding, el correo ni el reintento (FNC-138); cuenta separada para Sends (ADR-008 6B, si el dueño la elige se replanea).

## Archivos previstos
- `app/modules/secretos/cifrado.py`, `app/modules/secretos/vaultwarden.py` (o `sends.py` nuevo en el mismo módulo si `vaultwarden.py` pasa de ~450 líneas), `app/modules/secretos/configuracion.py`, `app/modules/secretos/__init__.py`
- `tests/secretos/` (incluye `vaultwarden_falso.py`), `docs/operacion/SECRETOS.md`, `docs/configuracion/VARIABLES.md`, `docs/configuracion/HISTORIAL.md`, `.env.example`

## Reutilización
- Sesión, transporte, `_json`, `_pedir`, `ClaveSimetrica`, `cliente_del_entorno()` y el doble `tests/secretos/vaultwarden_falso.py`.
- Si se crea `sends.py`, vive en `app/modules/secretos/`; responsabilidad única: Sends.

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos, escenas) | ¿Validado? |
|---|---|---|---|
| `secretos/cifrado.py` (funciones nuevas; las de descifrado no cambian) | módulo | `secretos/vaultwarden.py`; pruebas `tests/secretos/*`, `tests/connectors/test_credenciales_vaultwarden.py`, `tests/directory/test_bind_desde_gestor.py` | ☐ |
| `ClienteVaultwarden` / `cliente_del_entorno` | clase | `connectors/credenciales.py` (credenciales de conectores), `directory/configuracion.py` (bind `LDAP_BIND_PASSWORD_REF`) | ☐ |
| `secretos/configuracion.py` (variables nuevas) | módulo | validación al arrancar (`create_app`), `deploy/secretos.sh` | ☐ |

## Variables y configuración
| Variable | Por defecto | Rango | Sensible |
|---|---|---|---|
| `ONBOARDING_SEND_EXPIRATION_DAYS` | 7 | 1–30 | No |
| `ONBOARDING_SEND_MAX_ACCESS_COUNT` | 3 | 1–10 | No |
| `ONBOARDING_SEND_DELETION_DAYS` | 7 | ≥ caducidad, ≤ 31 | No |
| `VAULTWARDEN_SEND_BASE_URL` | vacía (= `VAULTWARDEN_URL`) | `https://<host>`; nunca IP | No |
- Registro en VARIABLES.md y HISTORIAL.md: `VAULTWARDEN_*` vuelven a ser necesarias en staging/prod (motivo: decisión del dueño 2026-11-17, revierte FNC-128).

## Criterios de aceptación
- [ ] Vector de prueba: un Send cifrado por el portal se descifra con la misma derivación (ida y vuelta) y el MAC se valida.
- [ ] Ningún valor (texto, llave del Send, clave de usuario) aparece en `repr`, errores ni logs (prueba con `caplog`).
- [ ] Fechas y aperturas salen de variables; fuera de rango → la app no arranca, mensaje sin valores.
- [ ] Vaultwarden caído → `GestorCaido`; política «Deshabilitar Send» o 4xx → permanente con motivo `send_deshabilitado`/`rechazado`.
- [ ] `borrar_send` idempotente (404 = ya no existe).
- [ ] Lectura de conectores y bind LDAP sin cambios: suite `tests/secretos`, `tests/connectors`, `tests/directory` en verde.
- [ ] Pruebas mínimas del lineamiento de pruebas, ejecutadas
- [ ] Cumple `docs/estandarizacion/` y no duplica código existente
- [ ] Sin direcciones IP ni secretos
- [ ] Cierra con `auditor-seguridad`

## Impacto cruzado
- Origen ← ADR-008
- Genera → FNC-138 (lo consume)
- Depende de → ADR-008 (6A) aprobado

## Riesgos y reversión
- Formato de Send propio de Bitwarden: validar contra la versión real de Vaultwarden (como el pendiente de FNC-068).
- Política «Deshabilitar Send» en la organización de la cuenta de servicio → todos los envíos quedan pendientes.
- Reversión: las funciones son nuevas; quitar la tarea no afecta la lectura.

## Verificación
- `python -m pytest -q -p no:cacheprovider -W ignore tests/secretos tests/connectors tests/directory` → 882 passed (incluye `tests/secretos/test_sends.py`, pruebas nuevas: ida y vuelta del cifrado y de la derivación (contra HKDF RFC 5869 aparte), modos `api` y `bw`, fallos transitorio/permanente, política «Deshabilitar Send», idempotencia del borrado, valores fuera de logs y `repr`, configuración).
- No verificado: contra un Vaultwarden real ni con la CLI `bw` real (ver `docs/operacion/SECRETOS.md`, verificación pendiente); el formato del Send y la salida de `bw send create` siguen la documentación y el cliente oficial, pero solo se probaron con dobles.
- Pendiente: `auditor-seguridad` sobre el bloque (se pide al cerrar FNC-138).

## Veredictos
| Agente | Veredicto | Fecha |
|---|---|---|
| tester | | |
| revisor | | |
| auditor-seguridad | | |

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-11-17 | Creada (decisiones del dueño A, 2026-11-17) |
| 2026-11-18 | Implementada: sends.py (modos api y bw), cifrado de Sends, variables ONBOARDING_SEND_* y VAULTWARDEN_SEND_*/BW_* |
