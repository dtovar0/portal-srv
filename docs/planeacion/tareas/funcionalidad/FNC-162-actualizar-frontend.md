# FNC-162 — `install.sh --actualizar-frontend`

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `fnc/FNC-162-actualizar-frontend` |

## Contexto
- Pedido del dueño: una opción para actualizar solo el frontend sin `--actualizar` completo (sus pasos manuales: npm ci, build, copiar estáticos, reiniciar el frontend).

## Cambios
- `deploy/actualizar.sh`: `actualizar_frontend_despliegue` (3 pasos: validar → detener frontend y build → arrancar y comprobar con journal si falla); fase `frontend_detenido` en el aviso de salida.
- `deploy/install.sh`: opción `--actualizar-frontend` (no se combina con `--actualizar` ni `--force`); el build del frontend pasa a `construir_frontend`, compartida con la instalación y `--actualizar` (sin duplicar).

## Decisiones (orquestador, pendientes de validar)
- El `git pull` NO lo hace el script: bash lee el script mientras corre y un pull que lo modifique a medio camino rompería la ejecución. Se hace antes, a mano.
- El frontend se detiene antes del build: `next build` reemplaza `.next` y el servidor en marcha se quedaría sin archivos (errores durante el build). Corte del frontend = lo que tarde el build.
- Si el build falla, el frontend queda detenido (el build anterior ya no existe) y se dice cómo reintentar; backend y worker siguen.

## Pruebas
- `tests/deploy/test_actualizar_sh.py`: orden y solo la unidad del frontend, validación fallida no detiene nada, build fallido deja el frontend detenido con el comando de reintento, journal si no arranca, cableado en `install.sh` y exclusión con `--actualizar`/`--force`.
