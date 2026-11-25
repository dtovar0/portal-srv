# FNC-204 — Cabeceras de cliente de Bitwarden en el cliente de Vaultwarden

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada** | 2026-11-25 |
| **Origen** | Prometido al dueño: robustez de rotaciones |

## Alcance
- Toda petición de `ClienteVaultwarden` (token, prelogin, sync, Sends) lleva `Bitwarden-Client-Name`, `Bitwarden-Client-Version` y `Device-Type`.
- Sin cambios en el modo `bw` ni en la configuración.

## Decisiones
| Tema | Decisión |
|---|---|
| Valores | Constantes en `secretos/vaultwarden.py`: nombre `cli`, versión `2024.12.0`; sin variables nuevas (no hay `VARIABLES.md` ni `HISTORIAL.md` que tocar) |
| `Device-Type` | Se agrega como cabecera con el mismo `TIPO_DISPOSITIVO` (25) que ya iba en el formulario del token |
| Punto único | `_pedir` mezcla las cabeceras de cliente con las de la llamada (estas ganan); no hay otra ruta de salida |

## Archivos
| Archivo | Cambio |
|---|---|
| `app/modules/secretos/vaultwarden.py` | Constantes y mezcla en `_pedir` |
| `tests/secretos/vaultwarden_falso.py` | Registra las cabeceras recibidas |
| `tests/secretos/test_vaultwarden.py` | 3 pruebas (todas las rutas, creación de Send, prioridad); fallan sin el cambio |
| `docs/backend/README.md`, `TABLERO.md`, `docs/logs/2026-11-25.md` | Documentación |

## Impacto en elementos compartidos
`ClienteVaultwarden._pedir` (usado por lectura de secretos, Sends, entregas de credenciales y rotaciones): ahora agrega 3 cabeceras; sin cambio de comportamiento propio. Ver `impacto.py` al cierre.

## Verificación
- `tests/secretos`: 129 passed. Prueba de regresión: sin la mezcla de cabeceras, 3 fallan.
- No verificado contra un Vaultwarden real (sin contactar servidores).

## Bitácora
- 2026-11-25: implementación y pruebas.
