# DIS-139 — Conectores: «Nuevo» en cualquier plataforma

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26, captura de Conectores vacía): no podía dar de alta un conector; la pantalla pedía elegir el tipo «conector» en la plataforma. Desde FNC-196 el backend acepta conector en cualquier plataforma, pero la web solo listaba las de `integration_type = conector`.

## Cambios
- `connectors/connector-list.tsx`: la lista muestra las plataformas con conector (`has_connector`) o de tipo `conector`; `plataformasSinConector` = candidatas de «Nuevo» (cualquier tipo).
- `connectors/connectors-admin.tsx`: «Nuevo» siempre abre «Elige la plataforma a la que se enlazará el nuevo conector»; la elegida abre su formulario aunque aún no esté en la lista; vacío: «Aún no hay conectores. Usa «Nuevo»…»; avisos `SIN_CANDIDATAS` y `SIN_PLATAFORMAS`.

## Decisiones
- Un conector por plataforma (modelo actual `platform_connectors`): se crea eligiendo la plataforma en el mismo paso. Conectores independientes (crear y asociar después) requieren cambio de modelo: pendiente de que el dueño lo confirme.
- Se quitó el atajo que, con una sola candidata, abría su formulario sin preguntar.

## Pruebas
- `connectors/connectors-admin.test.tsx` (+4 y 1 ajustada; 5 fallaban sin el cambio). Vitest 3565/3565; tsc y lint en 0.
