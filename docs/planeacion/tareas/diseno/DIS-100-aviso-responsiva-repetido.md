# DIS-100 — Aviso de la responsiva que se repite para el lector

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-100-aviso-responsiva-repetido` |

## Contexto
- Mejora de la auditoría de accesibilidad de DIS-098: `handleIntentoCerrar` ponía siempre el mismo texto en la región `aria-live`; React no cambia el DOM y el lector solo lo leía la primera vez. El toast sí salía cada vez. Pedido del dueño: implementarlo.

## Cambios
- `modal-responsiva.tsx`: el aviso alterna un espacio duro invisible al final en cada intento, así el nodo cambia y se vuelve a anunciar. Sin tocar el componente compartido `RegionDeAnuncios`.

## Pruebas
- `tests/components/responsiva.test.tsx`: dos Escape dejan textos distintos en la región (fallaba antes).
