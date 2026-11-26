# DIS-143 — Asociar conector: confirmar si la plataforma tiene accesos

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Web de FNC-215 (contrato conectores 1.7): asociar a un destino con accesos vigentes exige `confirmar`.

## Cambios
- `lib/access/connectors.ts`: `associate(id, platformId, confirmar = false)`; con `confirmar` envía `{"platform_id", "confirmar": true}`.
- `connectors/connector-associate-dialog.tsx`: ante `409 plataforma_destino_con_accesos` abre un `AlertDialog` (aviso) «La plataforma tiene accesos vigentes» y, al confirmar, reintenta con `confirmar`; cancelar no reintenta ni muestra error.

## Decisiones
- El mensaje no muestra el número de accesos: `ApiError` no conserva campos extra del cuerpo y ampliarlo afectaría a todas las pantallas.

## Pruebas
- `connectors-admin.test.tsx` (+2, 1 ajustada) y `peticiones.test.ts` (+1); 5 fallaban sin el cambio. Vitest 3628/3628; tsc y lint en 0.
