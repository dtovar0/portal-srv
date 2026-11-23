# DIS-106 — Advertencias de `npm run lint`

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-19 |
| **Rama** | `dis/DIS-106-advertencias-lint` |

## Contexto
- Pedido del dueño: «corrígelo» las advertencias de `npm run lint`, sin cambiar el comportamiento.

## Código sin usar (quitado)
- Imports: `Card` (approvals-inbox, jobs-log, note), `meetsRequirement`, `EmptyNote`, `ErrorNote`, `Spinner` (areas-list), `Field`, `TextInput` (audit-filters), `FilterBar`, `FilterBarGrid`, `Field` (jobs-filters), `Icono` (dashboard), `EmptyNote` (platform-form), `useEffect`, `MENSAJE_SUPERADMIN` (users-list).
- Constantes: `ROLE_LABELS`, `ROLE_TONES` (users-list).
- `setIntegration` (platform-form): el estado nunca cambiaba; queda `const [integration] = useState(...)`.
- `isEdit` de `validate` (platform-payload): último parámetro posicional, sus 3 llamadores (platform-form) lo dejan de pasar; no hay más usos ni pruebas.
- `segunSistema` / `onSegunSistema`: ningún componente los leía; se quitan de `MenuUsuario`, `BarraLateral` y de las dos llamadas en `marco.tsx` (y `tema`/`elegir` de `useTema()` en `marco.tsx`, que quedaron sin uso).

## Conservado (a medio quitar, con efecto potencial)
- `setShowPurge` (users-list): `showPurge` nunca pasa a `true`, así que `PurgePanel` no se muestra; no hay disparador. Se conserva con `eslint-disable-next-line` y motivo.
- `abrirRol` (users-list): ninguna vista lo invoca, por lo que los diálogos de rol (`roleOf`) son inalcanzables. Se conserva con `eslint-disable-next-line` y motivo.
- Decisión del dueño pendiente: reconectar o retirar la purga y las acciones de rol.

## Decisión por hook (`react-hooks/exhaustive-deps`)
| Lugar | Decisión | Motivo |
|---|---|---|
| `areas-list.tsx` `columnas` (`toggleSelectAll`) | disable con motivo | La función solo lee `allSelected` y `allDisplayIds` (ya en las dependencias) y usa setter funcional: sin dato viejo |
| `platform-admin.tsx` `columnas` (`toggleSelectAllPlatforms`) | disable con motivo | Igual que el anterior |
| `platform-admin.tsx` efecto (`selectedAreaId`) | disable con motivo | Intencional: se lee solo al montar o cambiar `initialAreaId`; agregarlo reejecutaría la lectura del historial al volver a la lista y reabriría el área cerrada |
| `users-list.tsx` `columnas` (`toggleAll`, `toggleUser`) | disable con motivo | Leen `selectedUserIds` (= `activeSelectedIds`, en las dependencias) y `lastSelectedId`, que solo cambia junto con la selección; no se pudo demostrar un cierre viejo, por eso no hay prueba que falle primero |

## `<img>` de la vista previa del logo
- `platform-form.tsx` (2): `eslint-disable-next-line @next/next/no-img-element` con motivo (vista previa local o https externo), igual que `areas/tarjeta-area.tsx`.

## Verificación
- `npx next lint`: «No ESLint warnings or errors» (antes 38 advertencias), código 0.
- `npx vitest run`: 95 archivos, 2847 pruebas, código 0.
- `npx tsc --noEmit`: código 0.
- `npm run build`: código 0.
- No verificado: la interfaz en un navegador (sin cambio visual esperado).

## Impacto en elementos compartidos
- `impacto.py` marca `Marco`, `UsersList`, `validate`, `avanzarAlPaso2/3`, `icono` y `save`; casi todo son coincidencias de nombre con otros módulos (Python, `area-form`, ajustes). Reales:
  - `Marco`/`BarraLateral`/`MenuUsuario`: se quitan props sin uso; solo los usa `marco.tsx`. Validar el marco (barra lateral y cajón móvil).
  - `validate` (`platforms/platform-payload.ts`): se quita `isEdit`; solo lo llama `platform-form.tsx`. Validar el alta y la edición de plataformas.
  - `UsersList`: solo imports, constantes y comentarios. Validar Usuarios.
