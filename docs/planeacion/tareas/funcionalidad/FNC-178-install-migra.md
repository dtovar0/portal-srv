# FNC-178 — `install.sh` aplica las migraciones

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24): «¿por qué no hiciste que deploy/install.sh corriera el `flask db upgrade`?».
- `--actualizar` ya corría `alembic upgrade head` (FNC-159). La instalación nueva no: fuera de desarrollo el backend no crea tablas (FNC-160) y arrancaba sin esquema.

## Cambios
- `deploy/install.sh`: `migrar_bd()` (única definición del comando) tras `instalar_dependencias` y antes de las unidades systemd; `actualizar_migrar` la reutiliza. Encabezado con el paso nuevo.
- `deploy/README.md`, `docs/operacion/ENTORNOS.md`: el instalador migra; respaldo manual antes.

## Pruebas
- `tests/deploy/test_actualizar_sh.py::test_instalacion_nueva_migra_antes_de_arrancar_regresion_fnc_178` (falló sin el cambio). `tests/deploy`: 263 passed. `bash -n` correcto.

## No verificado
- Ejecución real en Rocky/RHEL (requiere root y BD); la función es la misma que ya usaba `--actualizar`.
