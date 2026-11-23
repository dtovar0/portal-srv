# FNC-156 — Responsiva en accesos: modal, aprovisionamiento retenido y modo global o por plataforma

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend (incluye el modal web, hecho por el mismo agente) |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-18 |
| **Rama** | `fnc/FNC-156-responsiva-en-accesos` |

## Contexto
- Continúa FNC-155. Trabajo de otro agente a pedido del dueño, dejado sin commit en la carpeta base; lo guardó el orquestador sin cambios (`734b687`) y luego lo validó y corrigió.
- Reglas detalladas en `docs/business_rules.md` (cuatro secciones nuevas al final).

## Cambios (del otro agente)
- La responsiva pasa de pantalla completa a modal sobre el portal (`modal-responsiva.tsx`; se retira `pantalla-responsiva.tsx`).
- Accesos (`platform_access_grants`): `responsiva_firmada` y `responsiva_firmada_at` (migración 0017; existentes = firmados).
- `otorgar()`: si la responsiva no está firmada, el acceso queda `en_proceso` **sin encolar** el aprovisionamiento; `POST /me/firmar-responsiva` firma y encola los pendientes.
- Sin accesos pendientes de firma, el usuario navega y solicita libremente; con pendientes, la API (salvo `me`, responsiva y catálogo) responde `responsiva_requerida` y el catálogo oculta `direct_link`.
- `RESPONSIVA_MODO` = `global` (firma única) o `por_plataforma` (cada acceso nuevo); alternativa `RESPONSIVA_POR_PLATAFORMA`.

## Correcciones del orquestador
- Migración 0017 y modelo: `DEFAULT 1` → `sa.true()`/`db.false()` (PostgreSQL rechaza booleano con entero). Mismo error en 0014, corregido aparte (FNC-155, publicado).
- Docstring de 0017 con revisión correcta; variables en `VARIABLES.md` e `HISTORIAL.md`.

## Decisiones (del orquestador, pendientes de validar)
- Valor desconocido en `RESPONSIVA_MODO` = `global` (el comportamiento menos sorpresivo; no bloquea arranque).
- En `por_plataforma`, cambiar de nivel en una plataforma revoca el acceso anterior y el nuevo espera firma: el usuario pierde el acceso hasta firmar (comportamiento del diseño; se deja así).
- Revocar un acceso nunca aprovisionado encola la revocación igual (idempotente en LDAP).

## Pruebas
- `tests/test_responsiva.py` (otro agente), `tests/test_migraciones_postgresql.py` (tramo 0016:0017).
- Batería: ver bitácora del día.

## Correcciones de la auditoría de accesibilidad independiente (2026-11-19)
- B3 (bloqueante): `RegionDeAnuncios` de `modal-responsiva.tsx` estaba fuera del `Modal` (bajo `#raiz-app`, `inert`); ahora va dentro del cuerpo del diálogo. Regresión: `tests/components/responsiva.test.tsx`.
- M4: «Firmar…» sigue con `disabled` nativo (DIS-096 aún no está en esta rama) y suma el texto visible «Marca la casilla para firmar» con `aria-describedby`; retirado el código muerto `if (!aceptado)` de `handleFirmar`. Al integrar DIS-096 se dejó así (decisión del orquestador): el texto visible sirve a todos, no solo al foco o al puntero.
- M5: casilla con `.nexus-checkbox` (estándar del proyecto). M6: `text-2xs` (no existe) a `text-xs`. M8: el diálogo se describe con el texto de la carta (`describedBy`).
- M7 (Modal compartido con ✕ que no cierra): propuesta DIS-098 en el tablero de la rama DIS-097; no se tocó `Modal`.

