/**
 * ADUANA — Control de Acceso
 * Lógica no intrusiva para acciones en páginas de error de Nginx.
 */
document.addEventListener('DOMContentLoaded', function () {
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
});

