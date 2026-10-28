# DIS-076 — Paleta del diseño aprobado (claro y oscuro) en los tokens

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Agente** | disenador-web |
| **Fase** | 7 (7B, marco de administración) |
| **Módulo / Área** | tokens |
| **Prioridad** | Alta |
| **Estatus** | En revisión |
| **Rama** | `dis/DIS-076-paleta-aprobada` |
| **Creada** | 2026-10-28 |
| **Aprobada** | 2026-10-28, por el dueño: «exacto, ese sí es un diseño correcto, impleméntalo» |

## Contexto
- El resultado visual de la fase 7 (propuesta neutra) no convenció al dueño.
- Aprobó la maqueta del panel de administración: https://claude.ai/artifact/1SE1acTsMBkPsWpXcbrF6i (tablero «Panel»). Referencia local para los agentes: `/tmp/claude-1000/-home-dtovar-bayblade-pokemon/22e8923d-3d0a-4daf-9a12-07cd92cbd821/scratchpad/maqueta/project/Main.dc.html` (colores y estructura; no se copia tal cual: todo va con tokens y componentes).

## Objetivo
- Llevar a los tokens semánticos los colores de la maqueta aprobada: fondo, superficie, barra lateral, borde, texto, texto secundario, navegación, entrada, encabezado de tabla, acento, activo (fondo y texto) y estados aviso/éxito/error (fondo y texto), en claro y oscuro.
- Contraste AA medido en los 2 temas; pruebas de pares actualizadas.
- Sin cambiar estructura de componentes (eso es DIS-078/079).

## Criterios de aceptación
- [x] Colores de la maqueta aprobada en los tokens (estructura e iconos: DIS-077 a DIS-079)
- [x] Claro y oscuro con contraste AA medido (0 fallas; 2267 pruebas en verde)
- [x] Sin estilos inline ni colores literales fuera de `tokens.css`
- [ ] `auditor-accesibilidad`, `revisor` y revisión visual en `http://localhost:3000` (pendientes; no se levantó la app)

## Impacto cruzado
- Depende de DIS-078, DIS-079

## Cambios
- `frontend/src/styles/tokens.css` (v3.1): primitivos nuevos `--p-gris-*`, `--p-noche-*`, `--p-activo-*` y fondos/textos de estado; semánticos existentes reapuntados a ellos en claro, `@media` oscuro y `html.dark` (idénticos).
- Roles nuevos (claro y oscuro): `--color-barra-lateral`, `--color-entrada-fondo`, `--color-tabla-encabezado`, `--color-navegacion`, `--color-activo-fondo`, `--color-activo-texto`, `--color-exito-fondo`, `--color-aviso-fondo`, `--color-peligro-fondo`.
- Alias reapuntados: `--color-body-bg/text`, `--color-input-bg/text`, `--color-panel-header-bg`, `--badge-success/error/warning-*`, `--color-secondary` (oscuro), foco, seleccionado, deshabilitado, solo lectura. Sin renombres.
- Pruebas: 14 pares nuevos en `pares-contraste.ts`; 9 roles nuevos en `tokens-completitud.test.ts`.

## Decisiones
- El borde de la maqueta (`#E4E7EC` / `#262B36`) es ~1,3:1: queda en `--color-borde-sutil` (divisores, tarjetas). `--color-borde` (controles) sigue en 3:1 con un gris de la misma familia. DIS-079 decide qué componentes usan cada uno.
- `--color-superficie-elevada` oscuro (`28 34 46`) no está en la maqueta: derivado entre superficie y borde.
- Sin cambio (fuera de la maqueta o de estructura): `--color-header-bg/text` (barra superior, DIS-078), pestañas claras (`--color-tab-*`) y `--color-secondary` claro.
- Oscuro: `--color-secondary` pasó a `148 150 156` (con `113 130 153` fallaba 4,5:1 sobre la nueva superficie).

## Impacto en elementos compartidos
| Elemento modificado | Tipo | Usado en (vistas, módulos) | ¿Validado? |
|---|---|---|---|
| Valores de los semánticos de superficie, texto, borde, acción y estados (37 tokens según `impacto.py`) | tokens | toda la app vía `tailwind.config.ts`, `components.css`, `global.css`; cambia el aspecto de todas las pantallas en los 2 temas | No (validar visualmente) |
| `--badge-error/warning/success-*` | tokens | `.nx-badge-*` en `components.css` (insignias de todas las tablas) | No |
| `--color-input-bg`, `--color-input-text`, `--deshabilitado-*`, `--solo-lectura-fondo`, `--foco-anillo` | tokens | formularios, botones y estados en `components.css` | No |
| `tests/accesibilidad/pares-contraste.ts`, `tokens-completitud.test.ts` | pruebas | suite de accesibilidad | Sí (0 fallas) |

## Variables y configuración
- Registro en `docs/configuracion/VARIABLES.md` (Fase 7) y 8 entradas en `HISTORIAL.md` (motivo: paleta del diseño aprobado por el dueño, 2026-10-28).

## Verificación
- `tsc --noEmit` 0; `eslint .` 0; `vitest run` 0 (69 suites, 2267 pruebas, 0 fallas de contraste); `next build` 0.
- Tema claro/oscuro, móvil y escritorio: no verificado visualmente (sin captura).

## Bitácora
| Fecha | Nota |
|---|---|
| 2026-10-28 | Aprobada y trabajada (disenador-web). Tokens y pruebas de contraste actualizados; en revisión. |
