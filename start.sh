#!/usr/bin/env bash
# ==============================================================================
# Script de inicio unificado para Portal de Accesos
# Levanta concurrentemente el Backend (Flask :5001) y Frontend (Next.js :3000)
# ==============================================================================
set -e

# Ubicarse siempre en la raíz del proyecto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=================================================="
echo "🚀 Levantando servicios de Portal de Accesos"
echo "=================================================="

# 1. Validar entorno virtual de Python
if [ ! -f "venv/bin/python" ]; then
  echo "❌ Error: Entorno virtual 'venv' no encontrado en $ROOT_DIR/venv."
  echo "   Crea el entorno con: python3 -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

# 2. Validar dependencias de frontend
if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Instalando dependencias de frontend..."
  npm --prefix frontend install
fi

# 3. Aplicar migraciones de base de datos pendientes
echo "📦 Verificando esquema de base de datos..."
venv/bin/alembic upgrade head

# 4. Manejo de terminación limpia (Ctrl+C o kill)
cleanup() {
  echo ""
  echo "🛑 Deteniendo servicios..."
  trap - SIGINT SIGTERM EXIT
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Servicios detenidos correctamente."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 5. Iniciar Backend (Flask en puerto 5001)
echo "🐍 Iniciando Backend Flask (API) en http://localhost:5001..."
venv/bin/python run.py &
BACKEND_PID=$!

# 6. Iniciar Frontend (Next.js en puerto 3000)
echo "⚛️  Iniciando Frontend Next.js en http://localhost:3000..."
npm --prefix frontend run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "✨ Servicios levantados exitosamente:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔌 Backend:  http://localhost:5001"
echo "=================================================="
echo "Presiona Ctrl+C en esta terminal para detener ambos servicios."
echo ""

# Mantener activo mientras ambos procesos corran
wait "$BACKEND_PID" "$FRONTEND_PID"

