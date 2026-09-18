/* menu.js — menú móvil de la cabecera común de ailitica.com (rediseño f1, task #1143).
   Autor: Vista. Sin dependencias. Se carga con <script src="/menu.js" defer></script>.
   Abre y cierra #menu-movil desde el botón [data-nav-burger]; cierra al elegir un
   enlace, con Escape o al volver a anchura de escritorio. */
(function () {
  'use strict';
  var boton = document.querySelector('[data-nav-burger]');
  var menu = document.getElementById('menu-movil');
  if (!boton || !menu) return;

  function fijar(abierto) {
    menu.hidden = !abierto;
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  }

  boton.addEventListener('click', function () { fijar(menu.hidden); });
  menu.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('a')) fijar(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { fijar(false); boton.focus(); }
  });
  if (window.matchMedia) {
    var escritorio = window.matchMedia('(min-width: 860px)');
    var alCambiar = function (q) { if (q.matches) fijar(false); };
    if (escritorio.addEventListener) escritorio.addEventListener('change', alCambiar);
    else if (escritorio.addListener) escritorio.addListener(alCambiar);
  }
})();
