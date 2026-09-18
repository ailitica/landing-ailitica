/* ============================================================================
   consent.js — Mecanismo de consentimiento de cookies de ailitica.com
   ----------------------------------------------------------------------------
   Autor: Vista (Desarrollo Frontend). Task #1048, 7 de septiembre de 2026.
   Contrato funcional: apartado 6 del dictamen de Lex
   00_inbox/owner/lex_2609071700_dictamen-analitica-web-consentimiento.md

   Reglas que este fichero implementa y que no se pueden relajar:
   - gtag.js se inserta dinámicamente SOLO desde cargarEtiquetaGA(), que se
     ejecuta al pulsar "Aceptar" o al cargar una página con una aceptación
     guardada y vigente. Jamás desde el <head>.
   - Antes del consentimiento: cero peticiones a googletagmanager.com y a
     google-analytics.com, y cero cookies _ga*.
   - Tres acciones al mismo nivel, mismo tamaño y mismo peso: Aceptar,
     Rechazar y Configurar.
   - Prohibido el muro de cookies, el aspa que acepta, la aceptación por
     desplazamiento o por seguir navegando y las casillas premarcadas.
   - La preferencia vive en localStorage con marca de tiempo y vigencia de 24
     meses. Es la única escritura permitida antes del consentimiento, por ser
     estrictamente necesaria para recordar la decisión del visitante.
   - Enlace permanente "Preferencias de cookies" añadido por DOM al pie de
     todas las páginas. Al retirar el consentimiento se borran del dominio las
     cookies _ga y _ga_PWNT3YC598.

   Uso: <script src="/consent.js" defer></script> al final de cada página.
   ========================================================================== */
(function () {
  'use strict';

  // ── Configuración ────────────────────────────────────────────────────────
  // Los nombres de la clave de preferencia y de la cookie interna los fija Lex
  // en el apartado 2 de 01_legal/rgpd/260907_textos_cookies_privacidad.md y
  // están declarados con esas mismas letras en cookies.html. Si aquí cambian,
  // hay que cambiarlos también allí: declarar una cookie que no existe, o
  // instalar una que no se declara, es el defecto que ya nos costó la fila
  // fantasma «_tccl_visitor».
  var GA_ID = 'G-PWNT3YC598';
  var CLAVE = 'ailitica_cookie_consent';
  var VERSION_PREFERENCIA = 1;
  var VIGENCIA_MESES = 24;
  var COOKIE_INTERNA = 'ailitica_traffic_internal';
  var COOKIES_GA = ['_ga', '_ga_' + GA_ID.replace(/^G-/, '')];

  var etiquetaCargada = false;

  // ── Persistencia de la preferencia ───────────────────────────────────────
  function leerPreferencia() {
    var bruto;
    try {
      bruto = window.localStorage.getItem(CLAVE);
    } catch (e) {
      return null; // Almacenamiento no disponible: se vuelve a preguntar.
    }
    if (!bruto) return null;
    var dato;
    try {
      dato = JSON.parse(bruto);
    } catch (e) {
      return null;
    }
    if (!dato || dato.v !== VERSION_PREFERENCIA || typeof dato.analitica !== 'boolean') {
      return null;
    }
    var marca = new Date(dato.ts);
    if (isNaN(marca.getTime()) || caducada(marca)) return null;
    return dato;
  }

  function caducada(marca) {
    var limite = new Date(marca.getTime());
    limite.setMonth(limite.getMonth() + VIGENCIA_MESES);
    return Date.now() > limite.getTime();
  }

  function guardarPreferencia(analitica) {
    var dato = {
      v: VERSION_PREFERENCIA,
      analitica: !!analitica,
      ts: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(dato));
    } catch (e) {
      // Si el navegador no deja escribir, la decisión rige en esta página y se
      // volverá a preguntar en la siguiente. Nunca se asume aceptación.
    }
    return dato;
  }

  // ── Cookies ──────────────────────────────────────────────────────────────
  function leerCookie(nombre) {
    var trozos = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < trozos.length; i++) {
      var par = trozos[i].trim();
      if (par.indexOf(nombre + '=') === 0) {
        return decodeURIComponent(par.slice(nombre.length + 1));
      }
    }
    return null;
  }

  function escribirCookie(nombre, valor, segundos) {
    var seguro = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = nombre + '=' + encodeURIComponent(valor) +
      '; path=/; max-age=' + segundos + '; SameSite=Lax' + seguro;
  }

  // Google escribe _ga y _ga_<id> en el dominio registrable, con punto inicial.
  // Hay que barrer todas las variantes de dominio y de ruta o la retirada del
  // consentimiento deja las cookies vivas y se convierte en un gesto vacío.
  function borrarCookie(nombre) {
    var host = location.hostname;
    var dominios = [null, host, '.' + host];
    var partes = host.split('.');
    for (var i = 1; i < partes.length - 1; i++) {
      var padre = partes.slice(i).join('.');
      dominios.push(padre, '.' + padre);
    }
    var rutas = ['/', location.pathname];
    var caducado = '=; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    for (var d = 0; d < dominios.length; d++) {
      for (var r = 0; r < rutas.length; r++) {
        document.cookie = nombre + caducado + '; path=' + rutas[r] +
          (dominios[d] ? '; domain=' + dominios[d] : '');
      }
    }
  }

  function borrarCookiesGA() {
    for (var i = 0; i < COOKIES_GA.length; i++) borrarCookie(COOKIES_GA[i]);
  }

  // ── Tráfico interno, sin ninguna dirección IP ────────────────────────────
  function esTraficoInterno() {
    return leerCookie(COOKIE_INTERNA) === '1';
  }

  function marcarInterno(activar) {
    if (activar) {
      escribirCookie(COOKIE_INTERNA, '1', 63072000); // 24 meses
    } else {
      escribirCookie(COOKIE_INTERNA, '', 0);
      borrarCookie(COOKIE_INTERNA);
    }
    return esTraficoInterno();
  }

  function procesarParametroInterno() {
    // El parámetro solo se atiende en la página interna. En cualquier otra URL
    // se ignora: si funcionara en todo el sitio, un enlace preparado instalaría
    // esta cookie en el navegador de un visitante sin su consentimiento
    // (art. 22.2 LSSI) y la Política de cookies dejaría de ser cierta.
    if (!/\/interno\.html$/.test(location.pathname)) return;
    var params;
    try {
      params = new URLSearchParams(location.search);
    } catch (e) {
      return;
    }
    if (!params.has('interno')) return;
    marcarInterno(params.get('interno') !== '0');
    // El parámetro se retira de la barra de direcciones para que nadie lo
    // comparta ni acabe en un enlace indexable.
    params.delete('interno');
    var cadena = params.toString();
    try {
      history.replaceState(null, '', location.pathname + (cadena ? '?' + cadena : '') + location.hash);
    } catch (e) { /* sin efecto si el navegador no lo permite */ }
  }

  // ── Etiqueta GA4, insertada solo con consentimiento ──────────────────────
  function gtag() {
    window.dataLayer.push(arguments);
  }

  function cargarEtiquetaGA() {
    if (etiquetaCargada) return;
    etiquetaCargada = true;

    window.dataLayer = window.dataLayer || [];

    // Modo de consentimiento v2. Publicidad denegada siempre y sin excepción:
    // esta web no hace publicidad ni remarketing.
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    gtag('js', new Date());

    var config = {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    };
    if (esTraficoInterno()) config.traffic_type = 'internal';
    gtag('config', GA_ID, config);
  }

  function enviarEvento(nombre, parametros) {
    if (!etiquetaCargada || !window.dataLayer) return;
    gtag('event', nombre, parametros || {});
  }

  // Eventos propios. La medición mejorada de la propiedad ya cubre el
  // desplazamiento y el tiempo de lectura: no se duplican aquí.
  // Nunca se envía a Google ningún dato escrito por la persona en el
  // formulario, ni su correo, ni su nombre, ni el texto del mensaje.
  function cablearEventos() {
    // generate_lead NO se dispara al pulsar "enviar": se dispara cuando el
    // envío ha ido bien de verdad. Escuchar el evento submit contaba como
    // conversión cualquier intento, incluido el que falla o el que se corta a
    // los 15 segundos, y una conversión que no existió es peor que no medirla.
    // Quien conoce el resultado real del envío es el manejador del formulario,
    // así que es él quien avisa con este evento.
    document.addEventListener('ailitica:formulario-enviado', function (e) {
      var detalle = (e && e.detail) || {};
      enviarEvento('generate_lead', {
        form_id: detalle.form_id || 'contacto',
        form_location: location.pathname
      });
    });

    // calculator_complete: lo avisa calculadora.js cuando la persona deja de
    // tocar datos. El evento no lleva ningún valor introducido.
    document.addEventListener('ailitica:calculadora-completada', function () {
      enviarEvento('calculator_complete', {});
    });

    document.addEventListener('click', function (e) {
      var enlace = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!enlace) return;
      var destino = enlace.getAttribute('href') || '';
      var metodo = null;
      if (destino.indexOf('mailto:') === 0) metodo = 'email';
      else if (/#contacto\b/.test(destino)) metodo = 'ancla_contacto';
      if (!metodo) return;
      enviarEvento('contact_click', {
        method: metodo,
        link_location: location.pathname
      });
    }, true);
  }

  // ── Estilos del banner y del panel ───────────────────────────────────────
  // Se inyectan desde aquí para que una sola línea de <script> baste en cada
  // página y no haya que tocar 56 cabeceras a mano.
  var CSS = [
    '.ailitica-consent, .ailitica-consent * { box-sizing:border-box; }',
    '.ailitica-consent {',
    '  position:fixed; left:0; right:0; bottom:0; z-index:9990;',
    /* Resets defensivos: este componente aterriza en 56 páginas con hojas de
       estilo propias, y basta un section{min-height:100vh} ajeno para que ocupe
       la pantalla entera. Ya pasó en index.html. */
    '  margin:0; width:auto; min-height:0; max-width:none; min-width:0;',
    '  font-family:"Google Sans Text","Google Sans",system-ui,-apple-system,"Segoe UI",sans-serif;',
    '  font-weight:300; color:#eef2ff;',
    '  background:rgba(2,8,20,0.96);',
    '  -webkit-backdrop-filter:blur(22px); backdrop-filter:blur(22px);',
    '  border-top:1px solid rgba(74,179,255,0.22);',
    '  padding:14px clamp(18px,4vw,56px);',
    '  padding-bottom:calc(14px + env(safe-area-inset-bottom, 0px));',
    '  box-shadow:0 -18px 48px rgba(0,0,0,0.45);',
    '}',
    '.ailitica-consent[hidden] { display:none !important; }',
    '.ailitica-consent__caja { max-width:1080px; margin:0 auto; display:flex; flex-direction:column; gap:14px; }',
    '.ailitica-consent__texto { font-size:13px; line-height:1.4; color:rgba(160,195,240,0.72); margin:0; }',
    '.ailitica-consent__texto a { color:#4ab3ff; text-decoration:underline; text-underline-offset:3px; }',
    /* Rejilla de tres columnas iguales: la usa el PANEL, donde las tres acciones
       siguen siendo botones idénticos. El banner la sobrescribe justo debajo. */
    '.ailitica-consent__acciones { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }',
    /* Banner compacto (especificación de Forma, 7-sep-2026, tras la revisión del
       CEO: ocupaba el 39 % del alto en móvil y tapaba el titular). Fila única con
       dos botones idénticos y "Configurar" como enlace de texto. El selector va
       anidado bajo .ailitica-consent a propósito, para no arrastrar al panel. */
    '.ailitica-consent .ailitica-consent__acciones {',
    '  display:flex; grid-template-columns:none;',
    '  align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;',
    '}',
    '.ailitica-consent .ailitica-consent__boton {',
    '  min-height:44px; min-width:0; width:auto; flex:0 1 auto;',
    '  padding:0 16px; font-size:13px; white-space:nowrap;',
    '}',
    /* Área táctil de 44 px aunque no tenga fondo ni borde. */
    '.ailitica-consent__enlace {',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  min-height:44px; padding:0 6px; font-size:13px;',
    '  font-family:"Google Sans","Google Sans Text",system-ui,sans-serif; font-weight:400;',
    '  color:#4ab3ff; background:none; border:none;',
    '  text-decoration:underline; text-underline-offset:3px;',
    '  cursor:inherit; -webkit-tap-highlight-color:transparent;',
    '}',
    '.ailitica-consent__enlace:focus-visible { outline:2px solid #4ab3ff; outline-offset:3px; }',
    '@media (min-width:760px) {',
    '  .ailitica-consent { padding:12px clamp(20px,3vw,48px);',
    '    padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px)); }',
    '  .ailitica-consent__caja { flex-direction:row; align-items:center; gap:24px; }',
    '  .ailitica-consent__mensaje { flex:1 1 auto; }',
    '  .ailitica-consent__texto { font-size:13.5px; line-height:1.45; }',
    '  .ailitica-consent .ailitica-consent__acciones { flex:0 0 auto; justify-content:flex-end; gap:12px; }',
    '  .ailitica-consent .ailitica-consent__boton { min-height:40px; padding:0 18px; font-size:13.5px; }',
    '  .ailitica-consent__enlace { min-height:40px; font-size:13.5px; }',
    '}',
    /* Las tres acciones comparten exactamente el mismo estilo: mismo tamaño,
       mismo peso tipográfico y mismo contraste. Es requisito del apartado
       3.2.3 de la Guía de cookies de la AEPD, no una preferencia estética. */
    '.ailitica-consent__boton {',
    '  min-height:46px; min-width:46px; width:100%;',
    '  display:inline-flex; align-items:center; justify-content:center;',
    '  padding:12px 18px;',
    '  font-family:"Google Sans","Google Sans Text",system-ui,sans-serif;',
    '  font-size:14px; font-weight:400; letter-spacing:.02em; line-height:1.2;',
    '  color:#eef2ff; background:rgba(74,179,255,0.13);',
    '  border:1px solid rgba(74,179,255,0.42); border-radius:50px;',
    '  cursor:inherit; -webkit-tap-highlight-color:transparent;',
    '  transition:background .18s, border-color .18s;',
    '}',
    '.ailitica-consent__boton:hover { background:rgba(74,179,255,0.24); border-color:rgba(74,179,255,0.68); }',
    '.ailitica-consent__boton:active { background:rgba(74,179,255,0.3); }',
    '.ailitica-consent__boton:focus-visible { outline:2px solid #4ab3ff; outline-offset:3px; }',
    /* Panel de configuración */
    '.ailitica-consent__panel {',
    '  position:fixed; inset:0; z-index:9991;',
    '  display:flex; align-items:flex-end; justify-content:center;',
    '  background:rgba(1,4,12,0.72);',
    '  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);',
    '}',
    '.ailitica-consent__panel[hidden] { display:none !important; }',
    '.ailitica-consent__dialogo {',
    '  width:min(720px,100%); max-height:88dvh; max-height:88vh; overflow-y:auto;',
    '  -webkit-overflow-scrolling:touch;',
    '  background:#040d20; color:#eef2ff;',
    '  border:1px solid rgba(74,179,255,0.22);',
    '  border-radius:24px 24px 0 0;',
    '  padding:26px clamp(18px,4vw,36px);',
    '  padding-bottom:calc(26px + env(safe-area-inset-bottom, 0px));',
    '  font-family:"Google Sans Text","Google Sans",system-ui,sans-serif; font-weight:300;',
    '}',
    '@media (min-width:760px) {',
    '  .ailitica-consent__panel { align-items:center; }',
    '  .ailitica-consent__dialogo { border-radius:24px; }',
    '}',
    '.ailitica-consent__panel h2 {',
    '  font-family:"Google Sans","Google Sans Text",system-ui,sans-serif;',
    '  font-size:20px; font-weight:300; letter-spacing:-.015em; margin:0 0 8px;',
    '}',
    '.ailitica-consent__panel p { font-size:13.5px; line-height:1.7; color:rgba(160,195,240,0.72); margin:0 0 14px; }',
    '.ailitica-consent__panel a { color:#4ab3ff; text-decoration:underline; text-underline-offset:3px; }',
    '.ailitica-consent__grupo {',
    '  border:1px solid rgba(74,179,255,0.15); border-radius:16px;',
    '  padding:16px 18px; margin-bottom:14px;',
    '}',
    '.ailitica-consent__grupo h3 {',
    '  font-family:"Google Sans","Google Sans Text",system-ui,sans-serif;',
    '  font-size:14px; font-weight:400; margin:0 0 6px; color:#eef2ff;',
    '}',
    '.ailitica-consent__grupo p { margin:0 0 8px; font-size:13px; }',
    '.ailitica-consent__fija { font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:rgba(120,160,210,0.6); }',
    '.ailitica-consent__interruptor {',
    '  display:flex; align-items:center; gap:12px; min-height:46px;',
    '  padding:8px 0; font-size:14px; color:#eef2ff; cursor:inherit;',
    '}',
    '.ailitica-consent__interruptor input { width:22px; height:22px; accent-color:#4ab3ff; flex:0 0 auto; cursor:inherit; }',
    '.ailitica-consent__panel .ailitica-consent__acciones { margin-top:18px; }',
    '@media (prefers-reduced-motion: reduce) { .ailitica-consent__boton { transition:none; } }'
  ].join('\n');

  function inyectarEstilos() {
    if (document.getElementById('ailitica-consent-css')) return;
    var estilo = document.createElement('style');
    estilo.id = 'ailitica-consent-css';
    estilo.textContent = CSS;
    document.head.appendChild(estilo);
  }

  // ── Construcción del banner (primera capa) ───────────────────────────────
  var banner = null;
  var panel = null;

  function construirBanner() {
    if (banner) return banner;
    // Un <div>, no un <section>: index.html declara section { min-height:100vh }
    // para sus pantallas completas, y el banner heredaba esa altura y tapaba la
    // portada entera. El rol de región se declara por atributo, que es lo que
    // lee el lector de pantalla.
    banner = document.createElement('div');
    banner.className = 'ailitica-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.setAttribute('aria-live', 'polite');
    // Copy compacto de un solo párrafo. Lo pidió el CEO (7-sep-2026, banner
    // demasiado grande), lo maquetó Forma y lo redactó Lex, que rechazó la
    // versión de Forma por dos motivos: no informaba de que el consentimiento
    // se puede retirar antes de darlo (art. 7.3 del RGPD) y decía "usa cookies"
    // para describir algo que todavía no ocurre. Este párrafo es el suyo,
    // literal, comillas angulares incluidas. Conserva los cuatro elementos
    // obligatorios del apartado 6.2 de su dictamen: responsable, finalidad de
    // medición, tercero Google con transferencia a Estados Unidos, y enlace a
    // la Política de cookies. No se reescribe de estilo.
    banner.innerHTML =
      '<div class="ailitica-consent__caja">' +
        '<div class="ailitica-consent__mensaje">' +
          '<p class="ailitica-consent__texto">' +
            'Ailitica S.L. quiere usar cookies propias y de terceros para medir la audiencia ' +
            'de esta Web. El tercero es Google, lo que implica transferir tus datos a Estados ' +
            'Unidos. Si no aceptas, la Web funciona igual, y puedes cambiar de opinión cuando ' +
            'quieras desde «Preferencias de cookies», en el pie. Más información en nuestra ' +
            '<a href="/cookies.html">Política de cookies</a>.' +
          '</p>' +
        '</div>' +
        // Rechazar y Aceptar son dos botones idénticos: mismo tamaño, mismo peso
        // y mismo contraste (apartado 3.2.3 de la Guía de cookies de la AEPD).
        // Configurar va como enlace de texto en la misma capa, con zona de
        // pulsación de 44 px: lo permite el apartado 1.2.2 de Lex y lo confirmó
        // expresamente el 7-sep-2026. La paridad obligatoria es solo entre
        // Rechazar y Aceptar.
        '<div class="ailitica-consent__acciones">' +
          '<button type="button" class="ailitica-consent__boton" data-accion="rechazar">Rechazar</button>' +
          '<button type="button" class="ailitica-consent__boton" data-accion="aceptar">Aceptar</button>' +
          '<button type="button" class="ailitica-consent__enlace" data-accion="configurar">Configurar</button>' +
        '</div>' +
      '</div>';

    banner.querySelector('[data-accion="aceptar"]').addEventListener('click', function () {
      decidir(true);
    });
    banner.querySelector('[data-accion="rechazar"]').addEventListener('click', function () {
      decidir(false);
    });
    banner.querySelector('[data-accion="configurar"]').addEventListener('click', function () {
      abrirPanel();
    });

    document.body.appendChild(banner);
    return banner;
  }

  function mostrarBanner() {
    construirBanner().hidden = false;
  }

  function ocultarBanner() {
    if (banner) banner.hidden = true;
  }

  // ── Construcción del panel (segunda capa) ────────────────────────────────
  function construirPanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'ailitica-consent__panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'ailitica-consent-titulo');
    panel.innerHTML =
      '<div class="ailitica-consent__dialogo">' +
        // Texto literal del apartado 1.3 de los textos definitivos de Lex.
        '<h2 id="ailitica-consent-titulo">Preferencias de cookies</h2>' +

        '<div class="ailitica-consent__grupo">' +
          '<h3>Necesarias</h3>' +
          '<p>Guardamos en tu navegador únicamente tu decisión sobre estas cookies, para no ' +
          'volver a preguntártela en cada página. Es estrictamente necesario para prestarte ' +
          'ese servicio, así que no requiere tu autorización. No sirve para identificarte ni ' +
          'para medir nada.</p>' +
          '<span class="ailitica-consent__fija">Siempre activas</span>' +
        '</div>' +

        '<div class="ailitica-consent__grupo">' +
          '<h3>Analíticas</h3>' +
          '<label class="ailitica-consent__interruptor">' +
            '<input type="checkbox" id="ailitica-consent-analitica">' +
            '<span>Activar las cookies analíticas</span>' +
          '</label>' +
          '<p>Nos permiten medir de forma estadística cuántas visitas recibe la Web, qué ' +
          'páginas se leen y cómo se navega por el sitio, para decidir qué contenidos ' +
          'publicamos. Las presta Google, lo que implica una transferencia de tus datos a ' +
          'Estados Unidos. Detalle de cada cookie en la ' +
          '<a href="/cookies.html">Política de cookies</a>.</p>' +
        '</div>' +

        '<div class="ailitica-consent__acciones">' +
          '<button type="button" class="ailitica-consent__boton" data-accion="rechazar-todas">Rechazar todas</button>' +
          '<button type="button" class="ailitica-consent__boton" data-accion="guardar">Guardar preferencias</button>' +
          '<button type="button" class="ailitica-consent__boton" data-accion="aceptar-todas">Aceptar todas</button>' +
        '</div>' +
      '</div>';

    panel.querySelector('[data-accion="aceptar-todas"]').addEventListener('click', function () {
      decidir(true);
    });
    panel.querySelector('[data-accion="rechazar-todas"]').addEventListener('click', function () {
      decidir(false);
    });
    panel.querySelector('[data-accion="guardar"]').addEventListener('click', function () {
      decidir(panel.querySelector('#ailitica-consent-analitica').checked);
    });
    // El fondo NO acepta ni rechaza: solo cierra el panel y deja el banner a la
    // vista, para que cerrar nunca equivalga a consentir.
    panel.addEventListener('click', function (e) {
      if (e.target === panel) cerrarPanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel && !panel.hidden) cerrarPanel();
    });

    document.body.appendChild(panel);
    return panel;
  }

  function abrirPanel() {
    inyectarEstilos();
    var p = construirPanel();
    var actual = leerPreferencia();
    // Nunca premarcada: solo aparece marcada si ya existe una aceptación viva.
    p.querySelector('#ailitica-consent-analitica').checked = !!(actual && actual.analitica);
    p.hidden = false;
    var foco = p.querySelector('#ailitica-consent-analitica');
    if (foco) { try { foco.focus(); } catch (e) {} }
  }

  function cerrarPanel() {
    if (panel) panel.hidden = true;
    if (!leerPreferencia()) mostrarBanner();
  }

  // ── Decisión ─────────────────────────────────────────────────────────────
  function decidir(analitica) {
    var previa = leerPreferencia();
    guardarPreferencia(analitica);
    if (panel) panel.hidden = true;
    ocultarBanner();

    if (analitica) {
      cargarEtiquetaGA();
      return;
    }

    // Retirada: se borran las cookies y se recarga para que no quede ninguna
    // instancia de gtag viva en memoria capaz de volver a escribirlas.
    borrarCookiesGA();
    window['ga-disable-' + GA_ID] = true;
    if (previa && previa.analitica) {
      location.reload();
    }
  }

  // ── Enlace permanente en el pie ──────────────────────────────────────────
  function anadirEnlacePie() {
    if (document.querySelector('[data-ailitica-consent-abrir]')) return;

    var enlace = document.createElement('a');
    enlace.href = '#preferencias-cookies';
    enlace.textContent = 'Preferencias de cookies';
    enlace.setAttribute('data-ailitica-consent-abrir', '');
    enlace.addEventListener('click', function (e) {
      e.preventDefault();
      abrirPanel();
    });

    var destino = document.querySelector('footer .footer-links') ||
                  document.querySelector('.footer-links');
    if (destino) {
      var correo = destino.querySelector('a[href^="mailto:"]');
      if (correo) destino.insertBefore(enlace, correo);
      else destino.appendChild(enlace);
      return;
    }

    // Respaldo para una página sin pie: enlace discreto al final del documento.
    var caja = document.createElement('div');
    caja.style.cssText = 'padding:18px; text-align:center; font-size:11px;';
    enlace.style.cssText = 'color:rgba(120,160,210,0.6); text-decoration:none;';
    caja.appendChild(enlace);
    document.body.appendChild(caja);
  }

  // ── Arranque ─────────────────────────────────────────────────────────────
  function iniciar() {
    procesarParametroInterno();
    inyectarEstilos();
    anadirEnlacePie();
    cablearEventos();

    var preferencia = leerPreferencia();
    if (preferencia && preferencia.analitica) {
      cargarEtiquetaGA();
    } else if (!preferencia) {
      mostrarBanner();
    }
    // Preferencia guardada y negativa: no se carga nada y no se vuelve a
    // preguntar hasta que caduque o el visitante abra el panel del pie.
  }

  // API mínima para interno.html y para depuración manual.
  window.AiliticaConsent = {
    abrirPanel: abrirPanel,
    marcarInterno: marcarInterno,
    esInterno: esTraficoInterno,
    estado: function () {
      return {
        preferencia: leerPreferencia(),
        interno: esTraficoInterno(),
        etiquetaCargada: etiquetaCargada
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
