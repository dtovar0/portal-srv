/**
 * ADUANA — Control de Acceso
 * Lógica no intrusiva para páginas de error de Nginx:
 * - Manejo de botones de acción (recargar, volver).
 * - Detección dinámica de la plataforma solicitada (host actual o parámetros SSO).
 * - Renderizado de icono / avatar con iniciales y nombre legible de la plataforma.
 * - Enlace contextual al catálogo de ADUANA con filtro de búsqueda.
 */
document.addEventListener('DOMContentLoaded', function () {
  // Manejo de botones de acción
  var reloadButtons = document.querySelectorAll('[data-action="reload"]');
  for (var i = 0; i < reloadButtons.length; i++) {
    reloadButtons[i].addEventListener('click', function (e) {
      e.preventDefault();
      window.location.reload();
    });
  }

  var ADUANA_ORIGIN = 'https://aduana.vivaro.com';

  var backButtons = document.querySelectorAll('[data-action="back"]');
  for (var j = 0; j < backButtons.length; j++) {
    backButtons[j].addEventListener('click', function (e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = ADUANA_ORIGIN + '/dashboard';
      }
    });
  }

  // Detección contextual de la plataforma solicitada
  try {
    var params = new URLSearchParams(window.location.search);
    var destinoRaw = params.get('rd') || params.get('target') || params.get('redirect_uri') || params.get('url') || params.get('origin');
    var host = window.location.hostname || '';
    var origin = window.location.origin || '';

    if (destinoRaw && (destinoRaw.indexOf('http://') === 0 || destinoRaw.indexOf('https://') === 0)) {
      try {
        var parsed = new URL(destinoRaw);
        host = parsed.hostname;
        origin = parsed.origin;
      } catch (e) {
        // Formato no estándar, conservar host
      }
    }

    if (host) {
      var partes = host.split('.');
      var rawSlug = (partes.length > 2) ? partes[0] : host;
      if (rawSlug === 'localhost' || rawSlug === '127.0.0.1') {
        rawSlug = 'Plataforma';
      }

      // 1. Formatear nombre legible (ej. "terminal-packet" -> "Terminal Packet")
      var nombreFormateado = rawSlug
        .split(/[-_]/)
        .map(function (palabra) {
          return palabra ? (palabra.charAt(0).toUpperCase() + palabra.slice(1)) : '';
        })
        .join(' ');

      // 2. Extraer iniciales para el avatar si no hay icono cargado (ej. "TP")
      var iniciales = '';
      var palabras = nombreFormateado.split(' ');
      if (palabras.length >= 2 && palabras[0] && palabras[1]) {
        iniciales = (palabras[0].charAt(0) + palabras[1].charAt(0)).toUpperCase();
      } else if (palabras.length === 1 && palabras[0].length >= 2) {
        iniciales = palabras[0].slice(0, 2).toUpperCase();
      } else {
        iniciales = 'PL';
      }

      // 3. Inyectar nombre en los elementos designados
      var elsNombre = document.querySelectorAll('[data-plataforma-nombre]');
      for (var k = 0; k < elsNombre.length; k++) {
        elsNombre[k].textContent = nombreFormateado;
      }

      // 4. Inyectar iniciales en el avatar
      var elsIniciales = document.querySelectorAll('[data-plataforma-iniciales]');
      for (var m = 0; m < elsIniciales.length; m++) {
        elsIniciales[m].textContent = iniciales;
      }

      // 5. Cargar favicon / icono oficial de la plataforma si está disponible
      var elsIcono = document.querySelectorAll('[data-plataforma-icono]');
      if (origin && origin.indexOf('http') === 0) {
        var faviconUrl = origin + '/favicon.ico';
        for (var p = 0; p < elsIcono.length; p++) {
          (function (imgEl) {
            imgEl.onload = function () {
              imgEl.classList.remove('hidden');
              var siblingInitials = imgEl.parentElement.querySelector('[data-plataforma-iniciales]');
              if (siblingInitials) {
                siblingInitials.classList.add('hidden');
              }
            };
            imgEl.onerror = function () {
              imgEl.classList.add('hidden');
            };
            imgEl.src = faviconUrl;
          })(elsIcono[p]);
        }
      }

      // 6. Conectar botón para prefiltrar en ADUANA
      var linksAduana = document.querySelectorAll('[data-link-aduana]');
      for (var n = 0; n < linksAduana.length; n++) {
        var base = linksAduana[n].getAttribute('href') || (ADUANA_ORIGIN + '/platforms');
        if (base.indexOf('http://') !== 0 && base.indexOf('https://') !== 0) {
          base = ADUANA_ORIGIN + (base.charAt(0) === '/' ? '' : '/') + base;
        }
        var sep = base.indexOf('?') === -1 ? '?' : '&';
        linksAduana[n].setAttribute('href', base + sep + 'buscar=' + encodeURIComponent(rawSlug));
      }

      // 7. Normalizar cualquier enlace de Dashboard hacia ADUANA
      var linksDashboard = document.querySelectorAll('[data-link-dashboard], a[href="/dashboard"], a[href$="/dashboard"]');
      for (var d = 0; d < linksDashboard.length; d++) {
        linksDashboard[d].setAttribute('href', ADUANA_ORIGIN + '/dashboard');
      }
    }
  } catch (err) {
    // Si ocurre un error, la plantilla conserva el valor seguro por defecto
  }
});
