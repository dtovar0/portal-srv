# DIS-138 — Plataformas sin enlace web: sin «Enlace pendiente»

| Campo | Valor |
|---|---|
| **Carril** | Diseño |
| **Plataforma** | web |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-26 |

## Contexto
- Dueño (2026-11-26, capturas de Packet → tacacs): con «Omitir enlace» activo la tabla seguía con «SIN ENLACE» y el aviso «Enlace pendiente: 1 plataforma requiere enlace directo». El texto del interruptor («…pero no se puede abrir») no explicaba que no se necesita un enlace web.

## Cambios
- `platforms/platform-form.tsx`: descripción de «Omitir enlace» → `DESCRIPCION_OMITIR_ENLACE` («Para plataformas que no necesitan un enlace web (por ejemplo, acceso por SSH o con un cliente de escritorio).»).
- `platforms/platform-columns.tsx`: `sinEnlaceWeb` (enlace vacío) → badge neutro «No requiere enlace web»; un enlace escrito pero no https sigue en «Sin enlace» (aviso).
- `platform-admin.tsx` + `platforms/missing-link-note.tsx`: el aviso solo cuenta enlaces escritos y no válidos: «Enlace no válido — N plataforma tiene un enlace no válido (debe ser https).».

## Decisiones
- «Omitir enlace» no se guarda aparte: desde DIS-133 el enlace es obligatorio sin el interruptor, así que enlace vacío = omitido. Las plataformas viejas sin enlace también se ven como «No requiere enlace web».
- No se tocaron las tarjetas del portal (`platform-card.tsx`, catálogo), que siguen diciendo «Sin enlace»: el dueño solo señaló la administración.

## Pruebas
- `platform-admin.test.tsx` (+3; fallaban sin el cambio).
