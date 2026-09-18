/* Animaciones del rediseño de ailitica.com (fase 1). Autor: Vista.
 *
 * Réplica en JS vanilla de las animaciones del diseño original (.dc.html).
 * Reglas:
 *  - Todo el texto ya está en el HTML servido: aquí solo se muestra u oculta.
 *  - Sin JS se ve el contenido completo (ver el <noscript> de cada página).
 *  - Con prefers-reduced-motion no hay rotaciones automáticas, ni fundidos,
 *    ni conteo; las interacciones del usuario (hover, toque) sí funcionan.
 *  - Nada se oculta si está a la vista al arrancar: sin parpadeos ni CLS.
 */
(function () {
  'use strict';

  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.22,.8,.3,1)';

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function hijos(el) { return el ? Array.prototype.slice.call(el.children) : []; }
  function css(el, estilos) { if (el) for (var k in estilos) el.style[k] = estilos[k]; }
  // Vuelve a lanzar una animación CSS aunque el valor no cambie.
  function relanzar(el, anim) { if (!el) return; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = anim; }
  function quitarClasesR(el) {
    if (!el || !el.classList) return;
    $$('*', el).concat([el]).forEach(function (n) {
      Array.prototype.slice.call(n.classList).forEach(function (c) { if (/^r\d+$/.test(c)) n.classList.remove(c); });
    });
  }
  function bajoElPliegue(el) { return el.getBoundingClientRect().top > window.innerHeight; }

  // ── Barra de progreso de lectura bajo la cabecera (todas las páginas) ──
  function progreso() {
    var barra = $('header div[style*="height: 3px"] > div');
    if (!barra) return;
    var pendiente = false;
    function pintar() {
      pendiente = false;
      var d = document.documentElement;
      var p = Math.min(1, d.scrollTop / ((d.scrollHeight - d.clientHeight) || 1));
      barra.style.width = Math.round(p * 100) + '%';
    }
    window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }, { passive: true });
    pintar();
  }

  // ── + / − en las preguntas frecuentes ──
  function faq() {
    $$('details > summary').forEach(function (s) {
      var signo = s.lastElementChild;
      if (!signo || !/^[+−]$/.test(signo.textContent.trim())) return;
      var d = s.parentElement;
      var pintar = function () { signo.textContent = d.open ? '−' : '+'; };
      d.addEventListener('toggle', pintar);
      pintar();
    });
  }

  // ── Aparición al hacer scroll (home) ──
  function aparicion() {
    if (reducido || !('IntersectionObserver' in window)) return;
    var objetivos = [];
    var agente = $('section[aria-label="Qué es un agente de IA"]');
    if (agente) {
      var h = hijos(agente);
      objetivos.push([h[0], 0]);
      hijos(h[1]).forEach(function (a, i) { objetivos.push([a, i * 0.12]); });
      objetivos.push([h[2], 0]);
    }
    ['#sectores', '#shadow'].forEach(function (id) {
      var s = $(id); if (s) { objetivos.push([hijos(s)[0], 0]); objetivos.push([hijos(s)[1], 0]); }
    });
    var areas = $('#areas'); if (areas) objetivos.push([hijos(areas)[0], 0]);
    hijos($('section[aria-label="Datos de contexto"]')).forEach(function (c) { objetivos.push([c, 0]); });
    var metodo = $('#metodo > div');
    if (metodo) {
      objetivos.push([hijos(metodo)[0], 0]);
      hijos($('ol', metodo)).forEach(function (li) { objetivos.push([li, 0]); });
    }
    var roi = $('#roi'); if (roi) objetivos.push([hijos(roi)[0], 0]);

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        css(e.target, { opacity: '1', transform: 'none' });
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    objetivos.forEach(function (o) {
      var el = o[0];
      if (!el || !bajoElPliegue(el)) return; // lo que ya se ve no se toca
      var previa = el.style.transition;
      css(el, {
        opacity: '0', transform: 'translateY(22px)',
        transition: 'opacity .8s ease, transform .8s ' + EASE + (previa ? ', ' + previa : ''),
        transitionDelay: o[1] ? o[1] + 's' : ''
      });
      io.observe(el);
    });
  }

  // ── Conteo de las cifras (home) ──
  function conteo() {
    var bloque = $('section[aria-label="Datos de contexto"]');
    if (!bloque || reducido || !('IntersectionObserver' in window) || !bajoElPliegue(bloque)) return;
    var cifras = hijos(bloque).map(function (c) {
      var el = c.firstElementChild, m = /^(\d+)(.*)$/.exec(el.textContent.trim());
      return m ? { el: el, fin: +m[1], sufijo: m[2] } : null;
    }).filter(Boolean);
    cifras.forEach(function (c) { c.el.textContent = '0' + c.sufijo; });
    var io = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      var t0 = performance.now(), D = 1600;
      (function paso(ahora) {
        var p = Math.min(1, (ahora - t0) / D), e = 1 - Math.pow(1 - p, 3);
        cifras.forEach(function (c) { c.el.textContent = Math.round(c.fin * e) + c.sufijo; });
        if (p < 1) requestAnimationFrame(paso);
      })(t0);
    }, { threshold: 0.35 });
    io.observe(bloque);
  }

  // ── Palabras del titular (home) ──
  function palabrasHero() {
    var h1 = $('#inicio h1');
    if (!h1 || reducido) return;
    var huecos = $$('span[style*="inline-grid"]', h1);
    if (!huecos.length) return;
    var i = 0;
    setInterval(function () {
      i = (i + 1) % 3;
      huecos.forEach(function (hueco, k) {
        hijos(hueco).forEach(function (w, j) {
          if (j === i) { w.style.visibility = 'visible'; relanzar(w, 'wordIn .6s ' + EASE + ' ' + (k * 0.08) + 's both'); }
          else { w.style.visibility = 'hidden'; w.style.animation = 'none'; }
        });
      });
    }, 3800);
  }

  // ── Así fluye una tarea (home) ──
  function flujo() {
    var caja = $('[aria-label^="Flujo de un agente"]');
    if (!caja || reducido) return;
    var partes = hijos(caja);
    var leyendas = hijos(hijos(partes[0])[1]);
    var nodos = hijos(partes[1]).map(function (n) {
      var h = hijos(n);
      return { caja: h[0], piezas: h.length > 2 ? h[1] : null, enlace: h[h.length - 1] };
    });
    var aprende = partes[2], giro = aprende && aprende.firstElementChild;
    var fase = 0, checks = 0;

    function pintar() {
      var aprendiendo = fase === 4;
      leyendas.forEach(function (l, i) { l.hidden = i !== fase; });
      nodos.forEach(function (n, i) {
        var on = i === fase, hecho = i < fase;
        css(n.caja, {
          background: on ? '#1F6FEB' : hecho ? '#1B1D22' : 'rgba(255,255,255,.6)',
          color: (on || hecho) ? '#fff' : '#8A8F99',
          boxShadow: on ? '0 14px 34px rgba(31,111,235,.22)' : 'none',
          transform: on ? 'scale(1.03)' : 'scale(1)'
        });
        n.enlace.style.background = hecho ? '#1B1D22' : '#E2E0D9';
        if (!n.piezas) return;
        css(n.piezas, { opacity: (on || hecho) ? '1' : '.35', transform: on ? 'none' : 'translateY(4px)' });
        hijos(n.piezas).forEach(function (p, k) {
          var ok = k < 3 ? (hecho || k < checks) : checks >= 4;
          var c = (aprendiendo && k === 3) ? '#1F6FEB' : hecho ? '#1B1D22' : '#1F6FEB';
          var marca = p.firstElementChild;
          p.style.color = ok ? '#1B1D22' : '#8A8F99';
          marca.textContent = ok ? '✓' : '';
          css(marca, { background: ok ? c : 'transparent', borderColor: ok ? c : '#C9CCD3' });
        });
      });
      css(aprende, { opacity: aprendiendo ? '1' : '.3', transform: aprendiendo ? 'none' : 'translateY(4px)' });
      if (aprendiendo) relanzar(giro, 'spinOnce 1.2s ' + EASE + ' both'); else giro.style.animation = 'none';
    }

    function tic() {
      var anterior = fase;
      fase = (fase + 1) % 5;
      if (anterior === 4) checks = 0;
      pintar();
      if (fase === 1) [1000, 1900, 2800].forEach(function (ms) {
        setTimeout(function () { if (fase === 1) { checks++; pintar(); } }, ms);
      });
      if (fase === 4) setTimeout(function () { if (fase === 4) { checks = 4; pintar(); } }, 900);
      setTimeout(tic, fase === 1 ? 4400 : fase === 4 ? 3200 : 2200);
    }
    pintar();
    setTimeout(tic, 1600);
  }

  // ── Sectores: panel expandible con rotación, hover y toque (home) ──
  function sectores() {
    var sec = $('#sectores');
    if (!sec) return;
    var fila = hijos(sec)[1];
    var paneles = hijos(fila).filter(function (a) { return a.tagName === 'A'; });
    if (paneles.length !== 6) return;
    var datos = paneles.map(function (a) {
      quitarClasesR(a);
      var h = hijos(a), pad = h[3], hp = hijos(pad);
      return { a: a, foto: h[0], num: h[2], pad: pad, h3: hp[0], numLinea: hp[0].firstElementChild, det: $('.sx-det', pad) };
    });
    var activo = 0, encima = false, movil = window.innerWidth < 860;
    var T = '.65s ' + EASE;

    // Misma geometría que el flex del diseño (activo 3,2 : resto 1, mínimo 64 px en
    // escritorio; 380 / 72 px en móvil), pero cada panel va en absoluto y se coloca
    // con transform. Así la rotación no desplaza cajas en el layout (sin CLS).
    function geometria() {
      var GAP = 10, pos = 0;
      if (movil) {
        datos.forEach(function (d, i) {
          var alto = i === activo ? 380 : 72;
          css(d.a, { width: '100%', height: alto + 'px', transform: 'translateY(' + pos + 'px)' });
          // El texto va en una caja fija de 380 px pegada al pie del panel con transform.
          css(d.pad, { inset: 'auto', top: '0px', left: '0px', right: '0px', height: '380px', transform: 'translateY(' + (alto - 380) + 'px)' });
          pos += alto + GAP;
        });
        fila.style.height = (pos - GAP) + 'px';
        return;
      }
      fila.style.height = '';
      var libre = fila.clientWidth - GAP * 5, u = libre / 8.2, resto = u, grande = 3.2 * u;
      if (u < 64) { resto = 64; grande = libre - 5 * 64; }
      datos.forEach(function (d, i) {
        var ancho = i === activo ? grande : resto;
        css(d.a, { width: ancho + 'px', height: '100%', transform: 'translateX(' + pos + 'px)' });
        css(d.pad, { inset: '0px', height: '', transform: 'none' });
        pos += ancho + GAP;
      });
    }

    function pintar(i0) {
      geometria();
      datos.forEach(function (d, i) {
        var on = i === activo, grande = on || movil;
        var anim = on ? 'wordIn .6s ' + EASE + ' both' : 'none';
        var desplazada = !movil && [2, 3, 4].indexOf(i) >= 0;
        // -45 % del panel = -31,03 % de una foto que mide el 145 % del panel.
        css(d.foto, { opacity: on ? '1' : '.55', left: '0px', width: desplazada ? '145%' : '100%', transform: desplazada ? 'translateX(-31.03%)' : 'none' });
        css(d.num, { fontSize: grande ? '56px' : '30px', display: (movil && !on) ? 'none' : 'block' });
        css(d.pad, { padding: (movil && !on) ? '22px' : '90px 22px 22px' });
        css(d.h3, {
          fontSize: grande ? 'clamp(20px,2vw,28px)' : '16px', whiteSpace: grande ? 'normal' : 'nowrap',
          writingMode: grande ? 'horizontal-tb' : 'vertical-rl', transform: grande ? 'none' : 'rotate(180deg)'
        });
        d.numLinea.style.display = (movil && !on) ? 'inline' : 'none';
        if (d.det) d.det.style.display = on ? 'grid' : 'none';
        if (on && i0 !== activo) {
          relanzar(d.num, anim);
          relanzar(d.h3, 'wordIn .6s ' + EASE + ' .1s both');
          if (d.det) hijos(d.det).forEach(function (n, k) { relanzar(n, 'wordIn ' + (k ? '.6s ' + (k * 0.06 + 0.02).toFixed(2) + 's' : '.5s') + ' ease both'); });
        } else if (!on) { d.num.style.animation = 'none'; d.h3.style.animation = 'none'; }
      });
    }

    // Paso a absoluto sin transición (misma posición que el flex de partida).
    fila.style.position = 'relative';
    datos.forEach(function (d) {
      css(d.a, { position: 'absolute', top: '0px', left: '0px', flex: 'none', minWidth: '0px', minHeight: '0px', transition: 'none' });
      // El texto se ancla al pie del panel sin que su caja cambie de origen.
      css(d.pad, { position: 'absolute', inset: '0px' });
      d.foto.style.transition = 'opacity .6s';
    });
    pintar(activo);
    void fila.offsetWidth;
    datos.forEach(function (d) { d.a.style.transition = 'width ' + T + ', height ' + T + ', transform ' + T; d.foto.style.transition = 'opacity .6s, width ' + T + ', transform ' + T; d.pad.style.transition = 'transform ' + T; });
    function activar(i) { var antes = activo; if (i !== activo) { activo = i; pintar(antes); } }

    datos.forEach(function (d, i) {
      d.a.addEventListener('mouseenter', function () { encima = true; activar(i); });
      d.a.addEventListener('focus', function () { encima = true; activar(i); });
      // En táctil el navegador emula mouseenter/focus antes del click: se decide con
      // el panel que estaba abierto al empezar el toque. Primer toque abre, segundo navega.
      var previo = null;
      d.a.addEventListener('pointerdown', function () { previo = activo; });
      d.a.addEventListener('click', function (e) {
        var abierto = previo === null ? activo : previo; previo = null;
        if (movil && abierto !== i) { e.preventDefault(); activar(i); }
      });
    });
    fila.addEventListener('mouseleave', function () { encima = false; });
    window.addEventListener('resize', function () {
      var m = window.innerWidth < 860;
      var cambia = m !== movil; movil = m; if (cambia) pintar(activo); else geometria();
    });
    if (!reducido) setInterval(function () { if (!encima) activar((activo + 1) % 6); }, 4200);
  }

  // ── Carrusel de áreas: pausa con el cursor (home) ──
  function pausaAreas() {
    var pista = $('#areas div[style*="ticker"]');
    if (!pista) return;
    var marco = pista.parentElement;
    marco.addEventListener('mouseenter', function () { pista.style.animationPlayState = 'paused'; });
    marco.addEventListener('mouseleave', function () { pista.style.animationPlayState = 'running'; });
  }

  // ── Caso de uso: traza del agente ──
  function traza() {
    var etiqueta = $$('span').filter(function (s) { return s.lastChild && s.lastChild.nodeType === 3 && s.lastChild.nodeValue.trim() === 'Agente trabajando'; })[0];
    if (!etiqueta || reducido) return;
    var cabecera = etiqueta.parentElement, caja = cabecera.parentElement;
    var reloj = cabecera.lastElementChild;
    var pasos = hijos(hijos(caja)[1]);
    var n = pasos.length, paso = 0;
    if (!n) return;
    var textos = pasos.map(function (p) { return hijos(p)[1].firstElementChild; });
    var escalada = /→|escalad|revisión|señalad|marcad|pendiente|espera/i;

    function pintar() {
      pasos.forEach(function (p, i) {
        var hecho = i < paso, on = i === paso;
        var esc = escalada.test(textos[i].textContent) && i === n - 1;
        var col = esc ? '#F5B14C' : '#7FB0FF';
        var marca = p.firstElementChild;
        css(p, { opacity: (hecho || on) ? '1' : '.3', transform: (hecho || on) ? 'none' : 'translateY(4px)' });
        marca.textContent = hecho ? '✓' : '';
        css(marca, { borderColor: hecho ? col : on ? '#fff' : 'rgba(255,255,255,.3)', background: hecho ? col : 'transparent' });
        textos[i].style.color = (hecho || on) ? '#fff' : '#B9BDC7';
      });
      reloj.textContent = '09:' + String(10 + Math.min(paso, n) * 2).padStart(2, '0');
    }
    pintar();
    setInterval(function () { paso = (paso + 1) % (n + 2); pintar(); }, 1600);
  }

  // ── Caso de uso: anatomía del agente, pila de 4 capas ──
  function capas() {
    var articulos = $$('article[data-layer]');
    if (articulos.length !== 4) return;
    var pila = $$('div[aria-hidden="true"]').filter(function (d) { return $$('button', d).length === 4; })[0];
    var botones = pila ? $$('button', pila) : [];
    var leyendas = pila ? hijos(pila.lastElementChild).filter(function (s) { return s.hasAttribute('data-capa-leyenda'); }) : [];
    var cuerpos = articulos.map(function (a) { quitarClasesR(a); return a.children[1]; });
    var chevrones = articulos.map(function (a) { return a.firstElementChild.lastElementChild; });
    var capa = 0, encima = false, reloj = null, movil = window.innerWidth < 760;

    function pintar() {
      botones.forEach(function (b, i) {
        var on = i === capa, h = hijos(b);
        css(b, {
          background: on ? (i === 3 ? '#1B1D22' : '#1F6FEB') : '#fff', color: on ? '#fff' : '#1B1D22',
          boxShadow: on ? '0 14px 34px rgba(31,111,235,.22)' : 'none', transform: on ? 'translateX(6px)' : 'none'
        });
        css(h[0], { background: on ? 'rgba(255,255,255,.16)' : '#F4F3EF', color: on ? '#fff' : '#1F6FEB' });
        h[2].style.opacity = on ? '1' : '0';
      });
      leyendas.forEach(function (l, i) { l.hidden = i !== capa; });
      articulos.forEach(function (a, i) {
        var on = i === capa;
        a.style.borderColor = on ? (i === 3 ? '#7FB0FF' : '#1F6FEB') : (i === 3 ? '#1B1D22' : '#fff');
        a.style.cursor = movil ? 'pointer' : 'default';
        cuerpos[i].style.display = (movil && !on) ? 'none' : 'grid';
        css(chevrones[i], { display: movil ? 'inline' : 'none' });
        chevrones[i].textContent = on ? '−' : '+';
      });
      if (pila) pila.style.display = movil ? 'none' : 'grid';
    }
    function elegir(i, ms) {
      encima = true; capa = i; pintar();
      clearTimeout(reloj); reloj = setTimeout(function () { encima = false; }, ms);
    }
    botones.forEach(function (b, i) {
      b.addEventListener('click', function () { elegir(i, 6000); });
      b.addEventListener('mouseenter', function () { elegir(i, 6000); });
    });
    articulos.forEach(function (a, i) { a.addEventListener('click', function () { if (movil) elegir(i, 8000); }); });
    window.addEventListener('resize', function () { var m = window.innerWidth < 760; if (m !== movil) { movil = m; pintar(); } });
    pintar();
    // En móvil la rotación abriría y cerraría acordeones y movería la página (CLS):
    // allí solo cambia al tocar.
    if (!reducido) setInterval(function () { if (!encima && !movil) { capa = (capa + 1) % 4; pintar(); } }, 3200);
  }

  function iniciar() {
    [progreso, faq, aparicion, conteo, palabrasHero, flujo, sectores, pausaAreas, traza, capas].forEach(function (f) {
      try { f(); } catch (e) { if (window.console) console.warn('animaciones: ' + (f.name || '') + ': ' + e.message); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
