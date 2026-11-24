"""Pruebas para las páginas de error corporativas de Nginx (ADUANA).

Verifica que las plantillas HTML cumplan con la identidad institucional,
cero estilos inline ni etiquetas <style>/<script> en HTML (regla del framework),
existencia de tokens de diseño y mapeo en la configuración de Nginx.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DEPLOY_ERRORS = ROOT / 'deploy' / 'errors'
NGINX_TMPL = ROOT / 'deploy' / 'nginx.conf.tmpl'

PAGINAS_REQUERIDAS = ['403.html', '404.html', '500.html', '502.html', '503.html', '504.html', '50x.html']


def test_existencia_de_todas_las_paginas_de_error():
    for pagina in PAGINAS_REQUERIDAS:
        ruta = DEPLOY_ERRORS / pagina
        assert ruta.is_file(), f'Falta la página de error: {pagina}'


def test_existencia_de_recursos_estaticos():
    tokens = DEPLOY_ERRORS / 'assets' / 'css' / 'tokens.css'
    css = DEPLOY_ERRORS / 'assets' / 'css' / 'error.css'
    js = DEPLOY_ERRORS / 'assets' / 'js' / 'error.js'
    logo = DEPLOY_ERRORS / 'assets' / 'brand' / 'isotype-aduana.png'

    assert tokens.is_file(), 'Falta tokens.css'
    assert css.is_file(), 'Falta error.css'
    assert js.is_file(), 'Falta error.js'
    assert logo.is_file(), 'Falta isotype-aduana.png'


def test_separacion_estricta_de_capas_sin_estilos_ni_scripts_inline():
    """Valida la prohibición absoluta de style='', <style> y <script> inline."""
    for pagina in PAGINAS_REQUERIDAS:
        contenido = (DEPLOY_ERRORS / pagina).read_text(encoding='utf-8')

        # No estilos inline
        assert 'style=' not in contenido.lower(), f'{pagina} contiene style=""'
        assert '<style' not in contenido.lower(), f'{pagina} contiene etiqueta <style>'

        # No scripts inline (solo enlace diferido a archivo js)
        scripts_inline = re.findall(r'<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>',
                                    contenido, re.IGNORECASE | re.DOTALL)
        assert len(scripts_inline) == 0, f'{pagina} contiene script inline'

        # Enlace a css y marca institucional
        assert '/errors/assets/css/error.css' in contenido, f'{pagina} no enlaza el CSS canónico'
        assert 'ADUANA' in contenido, f'{pagina} no contiene la marca institucional ADUANA'


def test_tokens_de_diseno_corporativo_aduana():
    """Valida que tokens.css defina los tokens oficiales del Manual de Identidad Corporativa."""
    tokens = (DEPLOY_ERRORS / 'assets' / 'css' / 'tokens.css').read_text(encoding='utf-8')
    css = (DEPLOY_ERRORS / 'assets' / 'css' / 'error.css').read_text(encoding='utf-8')

    assert "@import './tokens.css';" in css

    # Paleta Navy Profundo, Cian Tecnológico y Naranja Control
    assert '--aduana-bg-main: #1B2A38' in tokens
    assert '--aduana-bg-surface: #233546' in tokens
    assert '--aduana-cyan: #1CB5E0' in tokens
    assert '--aduana-orange: #F26419' in tokens

    # Tipografía corporativa
    assert "Montserrat" in tokens
    assert "Inter" in tokens

    # Soporte Light Mode
    assert 'prefers-color-scheme: light' in tokens


def test_mensajes_claros_y_limpios_en_errores():
    """Valida que 403 y 502 tengan mensajes cortos sin tecnicismos ni Authelia, sin detalle técnico y con icono."""
    for pagina in ('403.html', '502.html'):
        contenido = (DEPLOY_ERRORS / pagina).read_text(encoding='utf-8')
        assert 'No tienes acceso al recurso solicitado' in contenido, f'{pagina} no contiene el texto requerido'
        assert 'Tienes que pedir acceso a tu administrador' in contenido, f'{pagina} no contiene el texto de administrador'
        assert 'Authelia' not in contenido, f'{pagina} no debe mencionar Authelia para no confundir al usuario'
        assert 'technical-box' not in contenido, f'{pagina} no debe mostrar la caja de detalles técnicos'
        assert 'href="/platforms"' in contenido, f'{pagina} no enlaza a /platforms'
        assert 'Solicitar acceso en ADUANA' in contenido, f'{pagina} no tiene botón de solicitud en ADUANA'
        assert 'data-plataforma-nombre' in contenido, f'{pagina} no contiene data-plataforma-nombre'
        assert 'data-plataforma-icono' in contenido, f'{pagina} no contiene data-plataforma-icono'
        assert 'data-plataforma-iniciales' in contenido, f'{pagina} no contiene data-plataforma-iniciales'
        assert 'data-link-aduana' in contenido, f'{pagina} no contiene data-link-aduana'


def test_deteccion_dinamica_en_script_de_errores():
    """Valida que error.js incluya la lógica para extraer el host, icono y contextualizar el enlace de ADUANA."""
    js = (DEPLOY_ERRORS / 'assets' / 'js' / 'error.js').read_text(encoding='utf-8')
    assert 'data-plataforma-nombre' in js
    assert 'data-plataforma-icono' in js
    assert 'data-plataforma-iniciales' in js
    assert 'data-link-aduana' in js
    assert 'buscar=' in js


def test_nginx_plantilla_declara_paginas_de_error():
    """Valida que deploy/nginx.conf.tmpl configure las directivas error_page y location /errors/."""
    tmpl = NGINX_TMPL.read_text(encoding='utf-8')

    for codigo in ('403', '404', '500', '502', '503', '504'):
        assert f'error_page {codigo} /errors/{codigo}.html;' in tmpl, f'Falta directiva error_page {codigo}'

    assert 'location ^~ /errors/' in tmpl
    assert 'alias @PREFIX@/deploy/errors/;' in tmpl



def test_nginx_sirve_el_favicon_sin_depender_del_frontend_regresion_fnc_186():
    """Con Next caído, `/favicon.ico` sigue saliendo del código."""
    tmpl = (ROOT / 'deploy' / 'nginx.conf.tmpl').read_text()
    assert 'location = /favicon.ico {' in tmpl
    assert 'alias @PREFIX@/frontend/public/favicon.ico;' in tmpl
    assert (ROOT / 'frontend' / 'public' / 'favicon.ico').is_file()
    # Antes de `location /`, que manda todo a Next.
    assert tmpl.index('location = /favicon.ico') < tmpl.index('    location / {')


def test_resumen_de_install_no_pide_migrar_a_mano():
    texto = (ROOT / 'deploy' / 'install.sh').read_text()
    resumen = texto[texto.index('Pendiente:'):]
    assert 'Migraciones, si es una actualización' not in resumen
    assert 'cabeceras que solo nginx' not in resumen
