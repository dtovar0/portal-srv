"""Gestor de secretos en ejecución: Vaultwarden (FNC-068, ADR-005; FNC-136, ADR-008).

- `configuracion`: variables `VAULTWARDEN_*` y `ONBOARDING_SEND_*` y su
  validación al arrancar.
- `cifrado`: cifrado y descifrado del lado del cliente del protocolo Bitwarden.
- `vaultwarden`: cliente: lectura de una colección y sesión autenticada.
- `sends`: crear y borrar Sends de texto (modo `api` o CLI `bw`).

Lo usan `connectors.credenciales` (credenciales de conectores), el cliente
del directorio (contraseña de bind con `LDAP_BIND_PASSWORD_REF`) y el
onboarding de usuarios (entrega de credenciales por Send).
"""
