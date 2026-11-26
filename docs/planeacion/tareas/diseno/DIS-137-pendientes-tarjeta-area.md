# DIS-137 — «N por aprobar» en la tarjeta de área

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26, captura de la tarjeta de Packet): «que la card me indique cuántas solicitudes por aprobar hay y que al picar me mande a solicitudes por área».
- Depende de FNC-212 (`pending_by_area` en `inbox/stats`, contrato `solicitudes.md` 1.4).

## Cambios
- `areas/tarjeta-area.tsx`: prop `pendientes`; en la variante estándar, a la derecha del encabezado, badge `warning` con ícono `reloj` «N por aprobar» que es un enlace a `/approvals?status=pendiente&area_id=ID` (`rutaPendientesArea`). Detiene el clic para no abrir las plataformas. Con 0 no se muestra.
- `platform-admin.tsx`: `usePolling` de `requestsApi.inboxStats()` con el intervalo de la preferencia; si falla, las tarjetas no muestran la cifra.
- `access/approvals-inbox.tsx`: el filtro de área se inicia con `?area_id=` (`idDeUrl` en `filtro-url.ts`; solo enteros positivos).
- `lib/access/types.ts` y `mocks.ts`: `pending_by_area`.

## Decisiones (pendientes de validar con el dueño)
- Solo en la variante estándar (la de la captura); las otras 9 variantes de diseño no lo muestran todavía.
- El enlace reutiliza `.nx-estado-boton` (área táctil de 44 px con `::after`, DIS-114); excepción de `area-tactil` sube a 11.

## Pruebas
- `tarjeta-area.test.tsx` (+2), `platform-admin.test.tsx` (+2), `home/filtro-url.test.tsx` (+3): fallaban sin el cambio.
- Auditoría de accesibilidad: el enlace llevaba solo el contorno del navegador; se agregó `foco-visible` (anillo `--foco-anillo`, como `EstadoBadgeBoton`). Contraste del badge 5.20:1 claro y 9.46:1 oscuro.
