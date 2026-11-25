# FNC-198 — Conector: cambio de rol según el group mapping de la plataforma

| Campo | Valor |
|---|---|
| **Carril** | Funcionalidad |
| **Plataforma** | backend |
| **Fase** | 8 |
| **Estatus** | Propuesta |
| **Creada** | 2026-11-24 |
| **Origen** | FNC-196 |

## Alcance
- Hoy, al cambiar de nivel usuario ↔ admin solo cambia el grupo LDAP; el conector no se ejecuta (`provisioning/compuesto.py::_cambio_de_nivel`).
- Propuesto: que el conector cambie el rol de la cuenta local en la plataforma según su group mapping (operación de cambio de rol, sin dar de baja y de alta la cuenta).
