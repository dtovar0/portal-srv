# FNC-167 — Pruebas de componentes en verde

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |
| **Rama** | `fnc/FNC-167-pruebas-componentes` |

## Contexto
- Pedido del dueño: 20 pruebas de `frontend/tests/components/` fallaban igual en `develop`. Se decide por cada una si es bug o prueba desactualizada.

## Decisión por prueba
| Prueba | Tipo | Evidencia | Qué se hizo |
|---|---|---|---|
| `auth/login-oidc` ×5 (botón, emergencia, portada, callback) | Desactualizada | Texto del botón «Iniciar Sesión con Authelia» (306161e, branding 951343c) | Nombre del botón actualizado |
| `auth/login-oidc` «OIDC sin configurar» | Desactualizada | 306161e: botón persistente, ya no se oculta ni avisa | Reescrita: el botón persiste y navega a `authelia_url`; enlace directo con `noopener` |
| `menu-movil` ×2 (elegir opción, clic fuera) | Desactualizada | Entrada `/platforms` ahora «Portal» y abre `ModalTransicionPortal` salvo bandera de omitir | Enlace «Portal»; bandera `CLAVE_OMITIR_MODAL_PORTAL` en la prueba (el modal tiene sus pruebas) |
| `menu-movil` ×2 (conteo de entradas) | Desactualizada | `nav-items.ts` agrega «Portal»: admin_area 9, administrador 10 | Conteos actualizados |
| `navegacion-por-rol` ×3 | Desactualizada | Mismo cambio «Portal» (usuario ve solo «Portal») | Listas esperadas actualizadas |
| `marco-admin` marca | Desactualizada | `barra-lateral.tsx`: subtítulo «Control Centralizado» | Texto actualizado |
| `marco-admin` teclado ×2 | Desactualizada | `menu-usuario.tsx` agrega «Cambiar contraseña» como primer ítem | ↓ enfoca el primero; flecha lleva a «Cerrar sesión» |
| `dashboard-diseno-barra` ×3 | Desactualizada | El dashboard vive en `/dashboard` (`RUTA_DASHBOARD`), no en `/` | Ruta de la prueba; `/` añadida a las rutas sin botón |
| `icono` catálogo | Desactualizada | 5 iconos agregados (flecha-der, flecha-izquierda, candado, correo, recargar) | 45 → 50 y nombres nuevos en la lista esperada |
| `platforms-view` solicitar | Desactualizada | DIS-013: el envío exige casilla y código de confirmación | La prueba los completa (como `request-catalog.test.tsx`) |
| `platforms-view` favorito aria-disabled | **Bug** | `favorite-button.tsx` puso `disabled={busy}`: un botón deshabilitado pierde el foco, contra DIS-030 (conserva el foco) | Se quita `disabled`; queda `aria-disabled` y la guarda `if (busy) return`; sin cambio visual |

## Verificación
- `tsc --noEmit`: 0. `eslint .`: 0 errores, 0 advertencias. `vitest run tests/components`: 71 archivos, 965/965. `next build`: 0.
- No se tocaron `tests/accesibilidad/` ni tokens; no se borraron aserciones de accesibilidad o seguridad.

## Impacto en elementos compartidos
| Elemento | Usado en | ¿Validado? |
|---|---|---|
| `FavoriteButton` (sin `disabled`) | `platform-card`, catálogo, favoritos y tarjetas de plataformas | Pruebas de `platforms-view`; validar con el dueño el foco |

## Bitácora
- 2026-11-24: diagnóstico por prueba, correcciones, verificación y cierre.
