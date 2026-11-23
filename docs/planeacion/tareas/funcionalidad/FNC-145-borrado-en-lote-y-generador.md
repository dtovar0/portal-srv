# FNC-145 — Borrado en lote con resultado parcial y generador de contraseñas seguro

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | web |
| **Fase** | 7 |
| **Módulo / Área** | global |
| **Prioridad** | Alta |
| **Estatus** | Hecha |
| **Creada / Inicio / Finalizada** | 2026-11-17 |
| **Rama** | `fnc/FNC-145-borrado-en-lote-y-generador` |

## Cambios
- `src/lib/eliminar-en-lote.ts` (nuevo, compartido): lo usan `users-list`, `areas-list` y `platform-admin`. Se detiene en el primer error, devuelve lo eliminado; la pantalla avisa "Se eliminaron N de M.", lo quita de la selección y cierra el diálogo.
- `src/lib/generador-contrasena.ts`: sin Web Crypto lanza error (antes `Math.random`); muestreo por rechazo sin sesgo de módulo. `directory-account-form` muestra el error y usa `LONGITUD_MINIMA_GENERADOR`.

## Pruebas
- `tests/lib/eliminar-en-lote.test.ts` y 2 casos nuevos en `tests/lib/generador-contrasena.test.ts`.
