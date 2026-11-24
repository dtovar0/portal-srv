# Plan de recuperación Authelia y mejoras UI

**Fecha:** 2026-11-24  
**Alcance revisado:** frontend completo, flujo de autoservicio y correos de recuperación.  
**Estado:** fases 1–4 ejecutadas.

## Objetivo

Dar al flujo de recuperación una identidad corporativa clara de Authelia, eliminar asimetrías y establecer una ruta verificable para unificar las pantallas públicas sin degradar accesibilidad, temas ni contratos funcionales.

## Diagnóstico del proyecto

La auditoría estática cubrió 175 archivos TSX, 210 rutas/componentes de aplicación y siete pantallas públicas. El sistema cuenta con tokens semánticos, temas claro/oscuro, controles compartidos y reglas WCAG documentadas. La deuda se concentra en la adopción desigual de esos patrones.

| Hallazgo | Evidencia | Prioridad | Decisión |
| --- | ---: | --- | --- |
| Recuperación sin una presencia corporativa diferenciada | Una tarjeta funcional de una sola columna | Alta | Composición 50/50 con panel Authelia y panel funcional |
| Acciones de distinto ancho en pasos 2, 3 y confirmación | Flex dependiente del contenido | Alta | Cuadrículas de columnas iguales y altura mínima de 48 px |
| Mezcla de alias de marca y tokens semánticos | `aduana-cyan` en el flujo público | Alta | Migrar recuperación a `accion`, `accion-hover`, `accion-tenue` y `texto-enlace` |
| Pantallas públicas con lenguajes distintos | Login, emergencia, acceso denegado, logout y 404 | Media | Converger gradualmente a un shell público compartido |
| Botones HTML directos dispersos | 44 archivos contienen `<button>` | Media | Auditar por interacción; no sustituir mecánicamente controles especializados |
| Colores literales en TSX | 2 archivos | Media | Sustituir por tokens o encapsular previews deliberadas |
| Estilo inline | 1 archivo | Baja | Migrar a clase/token cuando se intervenga esa vista |
| Ausencia de prueba específica del autoservicio visual | Sin prueba del componente | Alta | Añadir cobertura de estructura, simetría y flujo inicial |

## Principios adoptados

1. Una sola marca visible por zona: Authelia en el panel corporativo y contexto funcional sobrio en el formulario.
2. Simetría geométrica: columnas 50/50 en escritorio, botones pares con el mismo ancho y controles de 48 px.
3. Jerarquía breve: marca, propósito, paso actual y acción; sin tarjetas informativas repetidas.
4. Tokens semánticos: ningún color literal nuevo y compatibilidad automática con ambos temas.
5. Adaptación progresiva: el panel corporativo se compacta en móvil y el formulario conserva todo el ancho.
6. Accesibilidad: encabezado único, regiones etiquetadas, foco visible, texto alternativo semántico y áreas táctiles mínimas.

## Fases ejecutadas

### Fase 1 — Auditoría e inventario

- Se revisaron rutas, componentes, estándares visuales, tokens y patrones de autenticación.
- Se cuantificó la deuda de colores literales, estilos inline, botones directos y pantallas públicas.
- Se preservó la lógica existente del flujo MFA y de recuperación por token.

**Resultado:** completada.

### Fase 2 — Identidad corporativa Authelia

- Se creó una composición dividida de dos columnas iguales.
- Se añadió panel de marca con escudo, nombre configurable, mensaje de recuperación y garantías de seguridad.
- Se usó un gradiente basado exclusivamente en tokens `primary`, `brand` y `accent`.
- En móvil el panel se convierte en una cabecera compacta y oculta detalles secundarios.

**Resultado:** completada.

### Fase 3 — Simetría, simplificación y accesibilidad

- Indicador de progreso reducido a tres nodos compactos.
- Botones Atrás/Continuar y las acciones finales distribuidos en columnas iguales.
- Altura táctil mínima de 48 px para acciones principales y secundarias.
- Etiquetas y títulos normalizados a estilo oración.
- Colores del flujo migrados a tokens funcionales de acción y enlace.
- Confirmación final condensada, sin una segunda tarjeta que repetía el mismo mensaje.

**Resultado:** completada.

### Fase 4 — Notificaciones y calidad

- Asuntos de correo condensados para una bandeja de entrada legible.
- Encabezados HTML sin degradados, emojis ni sombras innecesarias.
- Plantillas de código, enlace y confirmación alineadas visualmente.
- Validación con ESLint, compilación Python y pruebas del autoservicio.

**Resultado:** completada.

## Backlog priorizado del proyecto

### P1 — Shell público compartido

Crear un componente `PublicAuthShell` y migrar, en este orden: login, acceso de emergencia, acceso denegado, logout y página 404. Debe permitir panel de imagen o panel cromático sin duplicar estructura.

### P1 — Pruebas de pantallas públicas

Agregar pruebas de estructura responsiva, encabezado accesible, foco inicial, controles de 48 px y ausencia de colores literales para las siete pantallas públicas.

### P2 — Botones directos

Revisar los 44 archivos detectados. Migrar acciones estándar a `Button`/`ButtonLink`; conservar botones directos solo en controles compuestos que requieran semántica específica.

### P2 — Literales visuales

Revisar `platform-card-design-drawer.tsx` y `user-view-settings.tsx`. Si el color representa una maqueta deliberada, encapsularlo como token de preview; de lo contrario, usar un token semántico.

### P3 — Estilo inline residual

Migrar el estilo inline de `acceso-denegado-view.tsx` a una clase reutilizable o variable CSS documentada.

## Criterios de aceptación

- La recuperación presenta identidad Authelia inequívoca sin depender de una imagen externa.
- En escritorio las dos columnas tienen la misma proporción.
- Los pares de botones tienen igual ancho y una altura mínima de 48 px.
- No se introducen colores literales ni estilos inline.
- El flujo sigue funcionando para MFA por correo, Authenticator y enlace con token.
- ESLint del componente y las pruebas de autoservicio terminan correctamente.

## Archivos intervenidos

- `frontend/src/components/autoservicio-view.tsx`
- `app/modules/auth/autoservicio.py`
- `docs/planeacion/PLAN-RECUPERACION-AUTHELIA-Y-MEJORAS-UI-2026-11-24.md`
