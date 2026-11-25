# DIS-124 — Carta Responsiva solo con plataformas aprobadas

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- Dueño (2026-11-24, captura de un usuario nuevo): «como no hay ninguna plataforma activa, no tienes que mostrar el ícono de carta responsiva; en ajustes de vista general debe estar deshabilitada y en off; se activa hasta que se aprueba una plataforma».

## Cambios
- `platforms-shell.tsx` (barra superior) y `platforms-sidebar-view.tsx` (barra lateral): `responsivaDisponible = abribles.size > 0`; ícono, sección y modal de firma solo con accesos.
- `user-view-settings.tsx`: prop `responsivaDisponible`; sin accesos la opción queda apagada (`aria-checked=false`), `disabled`, con nota. Mismo patrón visual que la opción de badges (tokens existentes).
- La preferencia guardada no se borra: al aprobarse la primera plataforma vuelve a valer.

## Pruebas
- `tests/components/platforms-shell.test.tsx` (+3; 2 fallaban sin el cambio). Vitest 3436/3436; tsc, lint y build en 0.

## Nota
- La tarjeta «No disponible para solicitar» de la captura no es de esta tarea: `tacacs` no tiene integrado ningún nivel (DN de grupo o conector). Además la ACL `{5}` de LDAP impide al portal escribir `member` en `app-tacacs-*`.
