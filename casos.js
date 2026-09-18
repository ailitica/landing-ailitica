/* Filtros del listado de casos de uso (ailitica.com, rediseño f1).
 *
 * Sin JS se ven los 30 casos y las anclas #sector-* / #area-* desplazan a la
 * primera tarjeta de cada grupo. Con JS, entrar por una de esas anclas aplica
 * el filtro correspondiente. Con sector elegido se enseñan primero los casos
 * de ese sector y detrás los transversales («Todos los sectores»), igual que
 * en el diseño.
 */
(function () {
  'use strict';

  var ACTIVO = { borde: '#fff', fondo: '#fff', texto: '#1B1D22' };
  var INACTIVO = { borde: 'rgba(255,255,255,.25)', fondo: 'rgba(255,255,255,.08)', texto: '#fff' };
  var TRANSVERSAL = 'Todos los sectores';

  function slug(t) {
    return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function iniciar() {
    var lista = document.querySelector('[data-casos-lista]');
    if (!lista) return;
    var tarjetas = Array.prototype.slice.call(lista.querySelectorAll('[data-caso-area]'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filtro]'));
    var buscador = document.querySelector('[data-casos-buscar]');
    var contador = document.querySelector('[data-casos-contador]');
    var quitar = document.querySelector('[data-casos-quitar]');
    var vacio = document.querySelector('[data-casos-vacio]');
    var estado = { area: 'Todos', sector: 'Todos', q: '' };

    tarjetas.forEach(function (t) {
      t._texto = (t.textContent || '').toLowerCase();
      t._display = t.style.display;
    });

    chips.forEach(function (b) {
      b.setAttribute('type', 'button');
      b.addEventListener('click', function () {
        estado[b.getAttribute('data-filtro')] = b.getAttribute('data-valor');
        aplicar();
      });
    });
    if (buscador) {
      buscador.addEventListener('input', function () { estado.q = buscador.value.trim().toLowerCase(); aplicar(); });
    }
    if (quitar) {
      quitar.setAttribute('type', 'button');
      quitar.addEventListener('click', function () {
        estado = { area: 'Todos', sector: 'Todos', q: '' };
        if (buscador) buscador.value = '';
        aplicar();
      });
    }

    function aplicar() {
      var visibles = 0;
      tarjetas.forEach(function (t) {
        var area = t.getAttribute('data-caso-area'), sector = t.getAttribute('data-caso-sector');
        var ok = (estado.area === 'Todos' || area === estado.area)
          && (estado.sector === 'Todos' || sector === estado.sector || sector === TRANSVERSAL)
          && (!estado.q || t._texto.indexOf(estado.q) >= 0);
        t.hidden = !ok;
        t.style.display = ok ? t._display : 'none';
        // Con sector elegido, los del sector van delante de los transversales.
        t.style.order = (estado.sector !== 'Todos' && sector === TRANSVERSAL) ? '1' : '';
        if (ok) visibles++;
      });
      chips.forEach(function (b) {
        var activo = estado[b.getAttribute('data-filtro')] === b.getAttribute('data-valor');
        var c = activo ? ACTIVO : INACTIVO;
        b.style.borderColor = c.borde;
        b.style.background = c.fondo;
        b.style.color = c.texto;
        b.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
      var filtrado = estado.area !== 'Todos' || estado.sector !== 'Todos' || !!estado.q;
      if (contador) {
        contador.textContent = visibles + (visibles === 1 ? ' caso' : ' casos') + (filtrado ? ' con estos filtros' : '');
      }
      if (quitar) quitar.style.display = filtrado ? 'inline' : 'none';
      if (vacio) vacio.hidden = visibles !== 0;
    }

    function desdeAncla(desplazar) {
      var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
      var m = /^(sector|area)-(.+)$/.exec(h);
      if (!m) return false;
      var tipo = m[1], valor = null;
      chips.forEach(function (b) {
        if (b.getAttribute('data-filtro') === tipo && slug(b.getAttribute('data-valor')) === m[2]) valor = b.getAttribute('data-valor');
      });
      if (!valor) return false;
      estado = { area: 'Todos', sector: 'Todos', q: '' };
      estado[tipo] = valor;
      if (buscador) buscador.value = '';
      aplicar();
      if (desplazar) {
        var destino = document.querySelector('[data-casos-cabecera]') || lista;
        setTimeout(function () { destino.scrollIntoView({ block: 'start' }); }, 0);
      }
      return true;
    }

    window.addEventListener('hashchange', function () { desdeAncla(true); });
    if (!desdeAncla(true)) aplicar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
