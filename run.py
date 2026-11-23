"""Entrada de la app: Gunicorn usa `run:app`; `python run.py` es solo para
desarrollo local (FNC-009).

El servidor de desarrollo escucha solo en loopback y activa el depurador
únicamente con `APP_ENV=development`: el depurador de Werkzeug expuesto en
la red permite ejecutar código.
"""
import os

from app import create_app

app = create_app()

HOST_LOCAL = '127.0.0.1'
PUERTO_DESARROLLO = 5001

if __name__ == "__main__":
    desarrollo = (os.getenv('APP_ENV') or '').strip().lower() == 'development'
    app.run(debug=desarrollo, port=PUERTO_DESARROLLO, host=HOST_LOCAL)
