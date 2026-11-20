# DIS-113 — Botón «Diseño de tarjetas» en la barra superior y respaldo sin desglose

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-113-diseno-tarjetas-barra-superior` |
| **Origen ←** | Pedido del dueño: «quítame el botón de diseño de tarjetas y muévelo a la top bar»; al aplicar un diseño las tarjetas no cambiaban |
| **Depende de** | DIS-112 |

## Contexto
- El botón vivía en el encabezado del dashboard; el dueño lo quiere en la barra superior.
- En su servidor el backend aún no manda `desglose`: las tres variantes caían a «solo cifra», idénticas, y parecía que aplicar no hacía nada.

## Cambios
- `marco/barra-superior.tsx`: con `usePathname() === '/'` muestra `SelectorDisenoTarjetas` junto a tema, notificaciones y ayuda; en otras rutas no se monta.
- `dashboard/selector-diseno-tarjetas.tsx`: el disparador pasa de `Button` a `BotonIcono` (icono `ajustes`, nombre y tooltip «Diseño de tarjetas», 44 px, `aria-haspopup="dialog"`). El modal es el mismo.
- `dashboard/use-diseno-tarjetas.ts` (nuevo): hook que lee la preferencia al montar y escucha `EVENTO_DISENO_TARJETAS` (y `storage` de otras pestañas); `guardarDisenoTarjetas` ahora emite el evento aunque el almacenamiento falle. Aplicar cambia las tarjetas al instante, sin recargar.
- `dashboard.tsx`: sin botón ni estado propio; usa `useDisenoTarjetas()`. `PageHeader` queda solo con el título.
- `tarjeta-indicador.tsx`: sin desglose (o incoherente) cada diseño conserva su disposición (brillo, dos segmentos, medidor) con el anillo vacío, sin porcentaje ni leyenda ni «N activas»; en brillo el centro del anillo muestra «—» (`aria-hidden`); el lector oye solo el valor. Se retira `SoloCifra` y `data-diseno` ya no vale `solo-cifra`.
- `anillo-indicador.tsx`: `desglose` opcional; sin él, solo la pista con clase `nx-ind__aro--vacio` / `nx-ind__semi--vacio`.
- `components.css`: pista vacía en gris neutro (`texto-tenue` 22 % sobre `superficie-hundida`, solo tokens); se borra `.nx-ind__icono--grande` (solo la usaba `SoloCifra`).
- No se inventan datos: la cifra es el contador real.

## Pruebas
- Nuevo `tests/components/dashboard-diseno-barra.test.tsx` (9): botón en `/` con 44 px, nombre y tooltip; ausente en 4 rutas; mismo modal y guardado; aplicar cambia las tarjetas sin recargar; cambio externo; almacenamiento que falla.
- `dashboard-tarjetas-indicador.test.tsx`: sin desglose los 3 diseños conservan su `data-diseno`, anillo vacío, sin `%` ni partes; se distinguen entre sí; lector solo el valor; desglose incoherente conserva diseño; disparador `min-h-11`.
- `dashboard.test.tsx`: sin botón en el encabezado; tarjetas siguen el diseño guardado y el evento; sin desglose conservan su diseño; el ayudante `contadores` busca grupos por nombre.
- Las pruebas nuevas se escribieron antes del código y fallaron (10 fallos) antes de implementar.

## Verificación
| Comando | Resultado |
|---|---|
| `npx vitest run` | 98 archivos, 3021 pruebas, salida 0 |
| `npx tsc --noEmit` | salida 0 |
| `npx next lint` | salida 0, sin advertencias |
| `npm run build` | salida 0 |

No verificado: captura visual en tema claro y oscuro, móvil y escritorio (no se levantó la app); el tono de la pista vacía no tiene prueba de contraste propia (es decorativa, el dato va en texto). En móvil el botón queda visible (no se oculta bajo `sm` como Ayuda); no se midió el ancho de la barra a 320 px.

## Impacto en elementos compartidos
| Elemento | Qué cambió | Quién lo usa / qué validar |
|---|---|---|
| `BarraSuperior` (`marco/barra-superior.tsx`) | Botón nuevo solo en `/`; usa `usePathname` | `marco/marco.tsx`, o sea toda pantalla con marco: validar que en otras rutas la barra no cambia y que en `/` cabe en móvil |
| `Dashboard` (`dashboard.tsx`) | Sin botón ni estado; usa el hook | `dashboard-gate.tsx`, navegación |
| `SelectorDisenoTarjetas` | Disparador `BotonIcono`; mismas props | solo la barra superior |
| `guardarDisenoTarjetas` | Emite evento | solo el hook y el selector |
| `components.css` | Regla `--vacio` nueva; se borra `.nx-ind__icono--grande` | solo `.nx-ind*` |

## Estándares propuestos / tareas
- Ninguno; tareas `FNC` creadas: ninguna.

## Bitácora
- 2026-11-19: implementada y documentada en la rama `dis/DIS-113-diseno-tarjetas-barra-superior`; sin push ni merge.
