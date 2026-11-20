# DIS-114 — Estado de áreas y plataformas con el badge

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-20 |
| **Rama** | `dis/DIS-114-estado-con-badge` |
| **Origen ←** | Pedido del dueño: «en áreas, cuando presione el badge de estado puedes hacer toggle; si se desactiva muestra un modal de confirmación […] lo mismo en plataforma […] ya no será necesario el checkbox de activa» |
| **Depende de** | DIS-102..108 (aspecto de la tarjeta), FNC-163 (grupos LDAP de inactivos) |

## Contexto
- Desactivar un área exigía abrir «Editar», ir al paso 2 y quitar «Activa». El dueño quiere hacerlo desde el badge.
- Hasta hoy la tarjeta de área solo mostraba el badge cuando estaba inactiva.

## Cambios
- `estado-badge-boton.tsx` (nuevo): `EstadoBadgeBoton`. Sin permiso es un `Badge`. Con permiso es un botón con nombre «Desactivar/Activar área|plataforma X»; activa → `ConfirmDialog` («¿Desactivar el área X?» y la consecuencia: plataformas inactivas y grupos LDAP a inactivos); inactiva → activa directo. Toast de éxito o error (mensaje del servidor, p. ej. `409 grupos_en_inactivos`); si falla, no se recarga y el estado en pantalla no cambia. `stopPropagation` en el clic y en el diálogo (portal) para no abrir la tarjeta ni seleccionar la fila.
- `areas/tarjeta-area.tsx`: la tarjeta ya no es `role=button`; es un contenedor con clic (toda la tarjeta abre las plataformas con el ratón o el dedo) y «Ver plataformas» pasa a ser un `<button>` (nombre «Área X, N plataformas. Ver plataformas.»): control de teclado y de lector, sin controles anidados. El badge muestra siempre «Activa» o «Inactiva». Anillo de foco de la tarjeta con `:has(.nx-area-card__ir:focus-visible)`. Props nuevas: `puedeEditar`, `actualizarEstado`, `onEstadoCambiado`.
- `platform-admin.tsx`: tarjetas con `puedeEditar = superadmin o admin del área` y `PUT /areas/{id} {status}`; recarga áreas y plataformas (el backend mueve el estado de las plataformas del área). Columnas con `puedeEditarEstado` (mismo permiso que «Editar») y `PUT /platforms/{id} {status}`.
- `areas-list.tsx`: la columna Estado usa el mismo componente (permiso: superadmin o admin del área, como «Editar»).
- `platforms/platform-columns.tsx`: columna Estado con el componente.
- `areas/area-form.tsx` y `platforms/platform-form.tsx`: sin el control «Activa»; al crear no se envía `status` (el backend lo deja `Activo`), al editar tampoco (no se pisa). La vista previa muestra el estado actual de solo lectura.
- `styles/components.css`: `.nx-estado-boton` (área táctil 44 px por `::after`, hover con brillo) y el anillo de foco de la tarjeta.
- `tests/accesibilidad/area-tactil.excepciones.ts`: 2 excepciones medidas (el botón del badge por su `::after`; «Ver plataformas» porque la tarjeta completa abre las plataformas).

## Pruebas
- Nuevo `tests/components/estado-badge-boton.test.tsx` (13): activa → confirma → `Inactivo`; inactiva → `Activo` sin confirmar; cancelar no hace nada; sin permiso no es botón; `409` muestra el mensaje y no recarga; clic en badge y diálogo no abre la tarjeta; sin controles anidados; contraste e hit area.
- `platform-admin.test.tsx` (+7): tarjeta y tabla (activar, desactivar, 409), admin sin esa área, formularios de plataforma sin control y sin `status` en alta y edición. `areas-list.test.tsx` (+4): tabla por rol, formulario de área sin control, alta y edición sin `status`.
- Ajustadas las pruebas que asumían la tarjeta `role=button` y el control «Activa».
- Las pruebas se escribieron junto con el código, no antes: no se comprobó que fallaran primero.

## Contraste del badge (medido con la fórmula WCAG)
| Tema | Activa (éxito) | Inactiva (aviso) | Con hover (brillo 0,95) |
|---|---|---|---|
| Claro | 5,40:1 | 5,20:1 | 5,23 / 5,05 |
| Oscuro | 8,97:1 | 9,46:1 | 8,29 / 8,74 |

## Verificación
| Comando | Resultado |
|---|---|
| `npx vitest run` | 99 archivos, 3055 pruebas, salida 0 |
| `npx tsc --noEmit` | salida 0 |
| `npx next lint` | salida 0, sin advertencias |
| `npm run build` | salida 0 |

No verificado: captura visual en tema claro y oscuro, móvil y escritorio (no se levantó la app); la cabida de «Activa» junto a los logos y «Ver plataformas» en la cuadrícula 3×3 a 1024 px no se midió; no se probó contra el backend real (el `PUT` parcial `{status}` se apoya en que `PUT /areas` y `PUT /platforms` validan solo los campos enviados).

## Impacto en elementos compartidos
| Elemento | Qué cambió | Quién lo usa / qué validar |
|---|---|---|
| `TarjetaArea` | Ya no es `role=button`; botón «Ver plataformas»; badge siempre visible | Admin › Plataformas: validar clic en tarjeta, Tab/Enter en «Ver plataformas» y el anillo de foco |
| `columnasPlataformas` | Columna Estado con botón | tabla de plataformas de `platform-admin.tsx` |
| `AreaForm` | Sin «Activa»; sin `status` en el PUT | `/areas` y la edición de área |
| `PlatformForm` | Sin «Activa»; sin `status` en alta ni edición | alta y edición de plataformas |
| `components.css` | `.nx-estado-boton`, foco de `.nx-area-card` | solo esas clases |
| `area-tactil.excepciones.ts` | 2 excepciones | prueba de área táctil |

## Estándares propuestos / tareas
- `EstadoBadgeBoton` agregado al catálogo (`03-reutilizacion.md`). Tareas `FNC` creadas: ninguna.

## Bitácora
- 2026-11-20: implementada y documentada en la rama `dis/DIS-114-estado-con-badge`; sin push ni merge.
