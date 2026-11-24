# FNC-173 — Pre-commit para personas

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | infra |
| **Fase** | 8 |
| **Estatus** | Hecha |
| **Creada / Finalizada** | 2026-11-24 |

## Contexto
- `validar_proyecto.py` avisaba: no hay pre-commit con los lineamientos para personas. Pedido del dueño: corregir todos los hallazgos.

## Cambios
- `scripts/lineamientos/{comun,reglas,precommit}.py`: copia de `~/.claude/hooks/lineamientos/` (receta del agente `devops`).
- `.githooks/pre-commit` y `git config core.hooksPath .githooks` (por clon; documentado en el README).

## Verificación
- Archivo con `style={{ color: "red" }}` preparado → rechazado (código 1). Los scripts del hook → aceptados (código 0).
- `validar_proyecto.py`: sin el aviso de pre-commit.

## Impacto
- Todo commit de personas en este clon pasa por las reglas; los archivos ya excluidos en `.claude/lineamientos-ignorar` siguen excluidos.
