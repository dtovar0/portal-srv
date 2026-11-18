# ADR-008 — Onboarding: contraseña inicial entregada con un Send de Vaultwarden

- **Estatus:** Aceptada (2026-11-17: decisión principal del dueño; subdecisiones 3B, 4, 5A y 6A recomendadas por el orquestador y aceptadas por el dueño con «continua»; pendientes de validar en la prueba de concepto) · **Fecha:** 2026-11-17 · **Tareas:** FNC-135, FNC-136, FNC-137, FNC-138, FNC-139
- **Modifica:** P8 (2026-10-14, FNC-037/038), SEC-LDAP-09 y SEC-AUTHZ-06 (`docs/seguridad/LINEAMIENTOS.md`), ADR-005 (cliente de solo lectura) y la decisión del 2026-10-27 de desplegar sin Vaultwarden (FNC-128)

## Contexto
- P8: «el portal no maneja contraseñas de cuentas LDAP; la contraseña la maneja Authelia». Hoy `POST /users/directory` rechaza `password` (`400 campo_no_permitido`) y la cuenta nace sin `userPassword`.
- El dueño entrega las credenciales a mano con un Send de Vaultwarden; pide que el portal lo haga.
- `app/modules/secretos/` ya tiene sesión con Vaultwarden y el cifrado tipo 2 (AES-256-CBC + HMAC), pero solo descifra y solo lee.
- 2026-10-27 (FNC-128): despliegue sin Vaultwarden. El dueño lo revierte hoy para los Sends.

## Decisión del dueño (2026-11-17, confirmada)
| # | Tema | Decisión |
|---|---|---|
| 1 | P8 | Se modifica: el portal fija **solo la contraseña inicial** de onboarding (y la del reenvío); el resto del ciclo de la contraseña sigue en Authelia |
| 2 | Entrega | Send de texto en Vaultwarden (usuario, contraseña, URL del portal) cifrado del lado del cliente; el enlace va por correo con el módulo de notificaciones; la llave viaja en el fragmento `#` |
| 2a | Política | Mínimo 16, con mayúsculas, minúsculas, números y símbolos; igual para lo escrito y lo generado; el backend siempre la valida; valores en variables |
| 2b | Falla | Si Vaultwarden falla, nunca se manda la contraseña en claro: estado «credenciales pendientes» y reintento con la cola (ADR-003) |
| 2c | Reenvío | «Reenviar credenciales»: contraseña nueva y Send nuevo |
| 2d | Persistencia | La contraseña nunca se guarda en BD, auditoría ni logs |
| 2e | Vaultwarden | Vuelve al portal para los Sends; se reutiliza el cliente y el cifrado de `secretos/` |

## Decisión 3 — Mecanismo de reintento
| Alternativa | Pros | Contras |
|---|---|---|
| A. Fila en `provisioning_jobs` (operación `credenciales`, sin plataforma) | Reintentos, *backoff*, bitácora y pantalla Ejecuciones ya hechos | El ejecutor está atado a accesos (`access_id`, eventos de acceso, terna usuario-plataforma-nivel, `reintento.py`); cambia el contrato `conectores-y-ejecuciones` y la pantalla Ejecuciones; riesgo en un flujo crítico |
| **B. Tabla propia de entregas + mismo worker y cola RQ** | No toca el flujo de accesos ni Ejecuciones; reutiliza `segundos_de_espera`, la cola y el barrido | El worker acepta una segunda función en su lista blanca (FNC-137); el reintento manual es el botón «Reenviar» |

## Decisión 4 — Qué reintenta el trabajo
- La contraseña no se guarda, así que **cada reintento genera una contraseña nueva** (servidor, `secrets`), la reescribe en LDAP y crea un Send nuevo. La escrita por el administrador solo se usa en el primer intento síncrono.

## Decisión 5 — Cómo se escribe la contraseña en OpenLDAP
| Alternativa | Pros | Contras |
|---|---|---|
| **A. Operación extendida Password Modify (RFC 3062)** tras el alta | El servidor aplica su `password-hash` y su `ppolicy` | Una operación más; requiere permiso de la cuenta de bind |
| B. `userPassword` en claro en el `add` / `MODIFY_REPLACE` (trabajo sin commit actual de `writer.py`) | Simple | OpenLDAP lo guarda **en claro** salvo `ppolicy_hash_cleartext` |
| C. Prehash `{SSHA}`/`{CRYPT}` en el portal | Sin depender del servidor | El portal elige el algoritmo; puede no coincidir con lo que verifica Authelia |

## Decisión 6 — Cuenta de Vaultwarden que crea los Sends
| Alternativa | Pros | Contras |
|---|---|---|
| **A. La misma cuenta de servicio (`VAULTWARDEN_*`)** | Sin credencial nueva; el Send es personal (no usa la colección) | Esa credencial ahora también crea Sends |
| B. Cuenta aparte solo para Sends (`VAULTWARDEN_SEND_*`) | Privilegios separados | Más variables y otra credencial que rotar |

## Decisión final (2026-11-17)
| # | Elegida |
|---|---|
| 3 | B — tabla propia de entregas con el mismo worker y cola |
| 4 | Cada reintento genera contraseña nueva |
| 5 | A — Password Modify (RFC 3062); funciona con o sin `ppolicy` |
| 6 | A — la misma cuenta de servicio; verificar que la organización no tenga «Deshabilitar Send» |
| 7 | Sin campo «Confirmar contraseña» (mostrar u ocultar y generador) |
| 8 | Sin correo configurado: credenciales «pendientes»; la contraseña nunca se muestra en pantalla |
| 9 | Reenviar: solo el superadmin (SEC-AUTHZ-06 sin cambio) |

## Recomendación original
- 3B, 4 (contraseña nueva por reintento), 5A, 6A.
- Valores por defecto: caducidad 7 días, máximo 3 aperturas, borrado automático a los 7 días (Vaultwarden no acepta más de 31).

## Consecuencias
- Contrato `usuarios-directorio` v2 (FNC-135): `password` obligatorio en `POST /users/directory`, política publicada, `credentials_status` y reenvío.
- Cambia `docs/business_rules.md` (FNC-138), la fila P8 de `docs/contratos/README.md` (FNC-135) y SEC-LDAP-09/SEC-AUTHZ-06 (FNC-138).
- `VAULTWARDEN_*` pasan a ser necesarias en staging y producción; se registra en HISTORIAL con el motivo (reversión del 2026-10-27).
- Riesgos: política «Deshabilitar Send» de la organización; que los usuarios nuevos lleguen al dominio de Vaultwarden desde su red; correo interceptado (mitigado por aperturas y caducidad).
