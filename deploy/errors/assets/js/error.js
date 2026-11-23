/**
 * ADUANA — Control de Acceso
 * Lógica no intrusiva para páginas de error de Nginx:
 * - Acciones interactivas (recargar, volver).
 * - Detección dinámica de la plataforma destino (host / parámetros SSO de Authelia).
 * - Pre-enlace contextual a la plataforma ADUANA con filtro de búsqueda.
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

  var backButtons = document.querySelectorAll('[data-action="back"]');
  for (var j = 0; j < backButtons.length; j++) {
    backButtons[j].addEventListener('click', function (e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/dashboard';
      }
    });
  }

  // Detección contextual de la plataforma que originó el bloqueo o error
  try {
    var params = new URLSearchParams(window.location.search);
    var destinoRaw = params.get('rd') || params.get('target') || params.get('redirect_uri') || params.get('url') || params.get('origin');
    var host = window.location.hostname || '';
    var ruta = window.location.pathname || '';

    if (destinoRaw && (destinoRaw.indexOf('http://') === 0 || destinoRaw.indexOf('https://') === 0)) {
      try {
        var parsed = new URL(destinoRaw);
        host = parsed.hostname;
        ruta = parsed.pathname;
      } catch (e) {
        // Formato no estándar, conservar host actual
      }
    }

    if (host) {
      var partes = host.split('.');
      var nombrePlataforma = (partes.length > 2) ? partes[0] : host;
      if (nombrePlataforma === 'localhost' || nombrePlataforma === '127.0.0.1') {
        nombrePlataforma = 'Portal Local';
      }

      // 1. Mostrar nombre de la plataforma en la descripción
      var elsNombre = document.querySelectorAll('[data-plataforma-nombre]');
      for (var k = 0; k < elsNombre.length; k++) {
        elsNombre[k].textContent = '«' + nombrePlataforma + '»';
      }

      // 2. Mostrar host/ruta técnica en el recuadro de diagnóstico
      var rutaLimpia = (ruta && ruta !== '/' && !ruta.startsWith('/errors/')) ? ruta : '';
      var elsHost = document.querySelectorAll('[data-plataforma-host]');
      for (var m = 0; m < elsHost.length; m++) {
        elsHost[m].textContent = host + rutaLimpia;
      }

      // 3. Conectar el botón a ADUANA pasando el nombre para búsqueda automática
      var linksAduana = document.querySelectorAll('[data-link-aduana]');
      for (var n = 0; n < linksAduana.length; n++) {
        var base = linksAduana[n].getAttribute('href') || '/platforms';
        var sep = base.indexOf('?') === -1 ? '?' : '&';
        linksAduana[n].setAttribute('href', base + sep + 'buscar=' + encodeURIComponent(nombrePlataforma));
      }
    }
  } catch (err) {
    // Si ocurre algún fallo de lectura, la plantilla conserva el texto genérico
  }
});
