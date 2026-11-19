# Grupos LDAP de áreas y plataformas inactivas

> FNC-163. **No se ha probado contra un OpenLDAP ni un Authelia reales** (solo con el directorio simulado `ldap3`); validar en la instalación del dueño (ver «Prueba de humo»).

## Qué hace
- Área o plataforma a **Inactivo** → el worker **mueve** sus grupos LDAP (ModifyDN con `new_superior`, mismo `cn`) a la OU `LDAP_GROUPS_INACTIVE_BASE_DN`. No se sacan usuarios ni se renombra nada.
- Reactivar → los grupos regresan a su ubicación original (el DN guardado en la plataforma; el portal no la adivina).
- Una plataforma vuelve solo si ella **y** su área están `Activo`: reactivar un área no regresa los grupos de una plataforma inactiva por sí misma.
- Plataformas `conector` o sin grupo LDAP: no aplican, sin error.
- Cada resultado se audita (`grupos_movidos`, `grupos_traslado_fallido`; actor `sistema`) y se ve en la API de plataformas (`groups_location`, `groups_move_status`).
- Variable vacía = función apagada: desactivar sigue siendo solo del portal (comportamiento anterior).

## Qué configura el dueño
| Dónde | Qué |
|---|---|
| OpenLDAP | Crear la rama de inactivos, **fuera** de `LDAP_GROUPS_BASE_DN`: p. ej. activos en `ou=groups,dc=<base>` e inactivos en `ou=groups,ou=inactive,dc=<base>` (crear `ou=inactive` y, debajo, `ou=groups`) |
| OpenLDAP (ACL) | La cuenta `LDAP_BIND_DN` necesita `add`/`delete` de entradas hijas en ambas OU y `write` en el atributo de membresía de la OU de inactivos (ver `ENTORNOS.md`) |
| `.env` del backend y del worker | `LDAP_GROUPS_INACTIVE_BASE_DN=ou=groups,ou=inactive,dc=<base>` y reiniciar ambos |
| **Authelia** | La OU de inactivos debe quedar **fuera** de `authentication_backend.ldap.additional_groups_dn` y de `groups_filter` |

Sin lo de Authelia, **mover el grupo no corta el acceso**: Authelia lo seguiría encontrando. Ejemplo (Authelia 4.38; los DN son los del dueño):

```yaml
authentication_backend:
  ldap:
    additional_groups_dn: 'ou=groups'          # = LDAP_GROUPS_BASE_DN sin la base; NO 'ou=groups,ou=inactive'
    groups_filter: '(&(member={dn})(objectClass=groupOfNames))'
```
Authelia busca en todo el subárbol de `additional_groups_dn`: con `ou=groups` (relativo a la base) la rama `ou=groups,ou=inactive` queda fuera; si apunta a la raíz (`dc=<base>`) quedaría dentro y mover no cortaría el acceso.

## Qué cambia al mover
- El DN del grupo cambia. Una plataforma o aplicación que consulte el grupo **por DN** dejará de verlo mientras esté inactiva (es lo buscado).
- El atributo `memberOf` de los usuarios (si existe) **solo se actualiza** si OpenLDAP tiene los overlays `memberof` y `refint`; sin `refint`, los valores `memberOf` de los miembros siguen apuntando al DN viejo. Los grupos con `member` no se ven afectados.
- Con el grupo en inactivos, otorgar, revocar y consultar accesos **siguen funcionando** contra su ubicación actual (decisión del orquestador: se puede quitar acceso aunque la plataforma esté inactiva; un acceso otorgado entonces no da acceso efectivo, porque Authelia no ve el grupo).
- Mientras los grupos estén en inactivos o el traslado esté sin cerrar, cambiar el tipo o los DN de la plataforma responde `409 grupos_en_inactivos`: reactívala antes.
- Dos grupos con el mismo `cn` de OU distintas chocarían en la OU de inactivos (`destino_ocupado`, `fallido`).

## Fallos
| `groups_move_status` | Significado | Qué hacer |
|---|---|---|
| `pendiente` | El worker lo hará (reintentos con espera si el directorio falla; `PROVISIONING_MAX_ATTEMPTS`) | Verificar que el worker corre |
| `hecho` | Los grupos están donde corresponde | — |
| `fallido` | Error permanente o intentos agotados; `last_error` en `platform_group_moves` y evento `grupos_traslado_fallido` | Corregir (OU destino inexistente, grupo inexistente, nombre ocupado, permisos) y **guardar de nuevo la plataforma** (con un cambio de estado o sin él): rearma el traslado |

Códigos: `ou_destino_inexistente`, `grupo_inexistente`, `destino_ocupado`, `fuera_de_base`, `ou_original_invalida`, `directorio_no_configurado`, `directorio` (red o servidor).

## Límites conocidos
- Al encender la función en un portal con plataformas ya inactivas, no se mueven solas: guardar de nuevo cada plataforma las concilia (un área ya guardada sin cambio de estado no concilia).
- Si el grupo no existe en el directorio al desactivar, el traslado queda `fallido` (`grupo_inexistente`).
- Borrar una plataforma con sus grupos en inactivos no los regresa ni los borra: quedan en la OU de inactivos.

- Si `LDAP_GROUPS_INACTIVE_BASE_DN` se apaga o cambia con grupos ya movidos, el portal los pierde de vista: **regresa todo a activos antes** (reactiva las plataformas y espera `hecho`).
- Si el directorio mueve el grupo pero el worker cae antes de guardarlo, el reintento da `grupo_inexistente` (no se supone que el grupo del destino sea el suyo): regrésalo a mano a su OU y guarda de nuevo la plataforma.
- Dos plataformas no pueden tener el mismo `cn` de grupo con la función encendida (chocarían en la OU de inactivos).
- Carrera conocida: si alguien reactiva la plataforma justo mientras el worker cierra su traslado, puede quedar el grupo en inactivos; guardar de nuevo la plataforma lo corrige.

## Prueba de humo
1. Crear una plataforma de prueba con grupos en `LDAP_GROUPS_BASE_DN`; confirmar que Authelia da los grupos a un usuario de prueba.
2. Pasarla a Inactivo; esperar al worker; ver los grupos en la OU de inactivos y `groups_move_status = hecho`.
3. Cerrar sesión y entrar de nuevo: Authelia ya no debe devolver esos grupos al usuario.
4. Reactivar y confirmar que regresan a la OU original.
