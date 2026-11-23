#!/usr/bin/env bash
# ==============================================================================
# Helper modular para configuración de la variable PORTADA_ACTIVA en despliegues
# ==============================================================================

normalizar_booleano_portada() {
  local valor="$(echo "${1:-true}" | tr '[:upper:]' '[:lower:]' | xargs)"
  case "$valor" in
    1|si|s|yes|y|true|activa|activo)
      echo "true"
      ;;
    0|no|n|false|inactiva|inactivo)
      echo "false"
      ;;
    *)
      echo "true"
      ;;
  esac
}

leer_portada_env() {
  local archivo_env="${1:-.env}"
  if [ -f "$archivo_env" ]; then
    local valor="$(grep -E '^PORTADA_ACTIVA=' "$archivo_env" | head -n1 | cut -d'=' -f2- | tr -d '"'"'" | xargs)"
    if [ -n "$valor" ]; then
      normalizar_booleano_portada "$valor"
      return 0
    fi
  fi
  echo "true"
}

fijar_portada_env() {
  local archivo_env="${1:-.env}"
  local nuevo_valor="$(normalizar_booleano_portada "${2:-true}")"

  touch "$archivo_env"
  if grep -qE '^PORTADA_ACTIVA=' "$archivo_env"; then
    sed -i -E "s|^PORTADA_ACTIVA=.*|PORTADA_ACTIVA=${nuevo_valor}|g" "$archivo_env"
  else
    echo "PORTADA_ACTIVA=${nuevo_valor}" >> "$archivo_env"
  fi
}

decidir_portada_instalador() {
  local opcion_cli="${1:-}"
  local archivo_env="${2:-.env}"

  if [ -n "$opcion_cli" ]; then
    normalizar_booleano_portada "$opcion_cli"
    return 0
  fi

  leer_portada_env "$archivo_env"
}

