# FNC-211 — Aviso de desactivación por la cola del worker

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Propuesta |
| **Creada** | 2026-11-25 |

## Contexto
- Auditoría de seguridad de FNC-210: el aviso se envía síncrono dentro de la petición (`areas/api.py`, `platforms/api.py`) y sin límite de frecuencia; desactivar y reactivar repetidamente reenvía correos y alarga la petición con muchas personas.

## Propuesta
- Encolar el envío en el worker (como el aprovisionamiento) en vez de hacerlo en la petición.
- No repetir el aviso a la misma persona y plataforma dentro de una ventana configurable (variable registrada).
