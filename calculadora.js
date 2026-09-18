/* Calculadora de ROI (ailitica.com, rediseño f1). JS vanilla, sin dependencias.
 *
 * Mismo modelo que el diseño de Forma (calculadora-roi.dc.html). Los valores
 * por defecto van en el HTML, así que sin JS la página enseña el ejemplo
 * completo y coherente.
 *
 * Prellenado: /calculadora-roi.html#horas=160&reduccion=70&caso=conciliar-facturas
 * Claves: horas, coste, reduccion, agente, setup, captura, extra, riesgo, moneda, caso.
 *
 * Medición: cuando la persona ha cambiado algún dato y deja de tocar durante
 * unos segundos, se emite una sola vez `ailitica:calculadora-completada`, sin
 * ningún valor introducido. consent.js lo convierte en `calculator_complete`,
 * y solo si hay consentimiento de medición.
 */
(function () {
  'use strict';

  var CLAVES = {
    horas: 'humanHours', coste: 'hourly', reduccion: 'timeSaved', agente: 'agentMonthly',
    setup: 'setup', captura: 'capture', extra: 'extraBenefit', riesgo: 'riskMonthly'
  };
  var MONEDAS = { EUR: ['es-ES', '€'], USD: ['en-US', '$'], GBP: ['en-GB', '£'], MXN: ['es-MX', '$'] };
  var COLOR = { fuerte: '#1F6FEB', positivo: '#F5B14C', negativo: '#E5484D' };

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  function iniciar() {
    var form = $('form[data-calculadora]');
    if (!form) return;

    var campos = {};
    $$('[data-calc]', form).forEach(function (el) { campos[el.getAttribute('data-calc')] = el; });

    var v = {
      humanHours: num(campos.horas), hourly: num(campos.coste), currency: campos.moneda ? campos.moneda.value : 'EUR',
      timeSaved: num(campos.reduccion), agentMonthly: num(campos.agente), setup: num(campos.setup),
      capture: num(campos.captura), extraBenefit: num(campos.extra), riskMonthly: num(campos.riesgo)
    };

    // Prellenado desde el ancla.
    var params = leerAncla();
    var desdeCaso = false;
    Object.keys(CLAVES).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== '' && !isNaN(+params[k]) && +params[k] >= 0) {
        v[CLAVES[k]] = +params[k];
        desdeCaso = true;
      }
    });
    if (params.moneda && MONEDAS[params.moneda]) v.currency = params.moneda;
    volcarEnCampos();

    var aviso = $('[data-calc-out="caso"]');
    if (aviso && desdeCaso && params.caso) {
      var nombre = String(params.caso).replace(/[^a-z0-9áéíóúñü-]/gi, '').replace(/-/g, ' ');
      if (nombre) {
        aviso.textContent = 'Valores precargados desde el caso de uso «' + nombre + '». Ajústalos a tu empresa.';
        aviso.hidden = false;
      }
    }

    function volcarEnCampos() {
      var inverso = {};
      Object.keys(CLAVES).forEach(function (k) { inverso[CLAVES[k]] = k; });
      Object.keys(inverso).forEach(function (clave) {
        var el = campos[inverso[clave]];
        if (el) el.value = v[clave];
      });
      if (campos['reduccion-rango']) campos['reduccion-rango'].value = v.timeSaved;
      if (campos.moneda) campos.moneda.value = v.currency;
    }

    var tocado = false, emitido = false, espera = null;

    form.addEventListener('input', function (e) {
      var nombre = e.target.getAttribute('data-calc');
      if (!nombre) return;
      if (nombre === 'moneda') v.currency = e.target.value;
      else if (nombre === 'reduccion-rango') { v.timeSaved = num(e.target); if (campos.reduccion) campos.reduccion.value = e.target.value; }
      else if (CLAVES[nombre]) {
        v[CLAVES[nombre]] = num(e.target);
        if (nombre === 'reduccion' && campos['reduccion-rango']) campos['reduccion-rango'].value = e.target.value;
      }
      tocado = true;
      pintar();
      programarMedicion();
    });
    form.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-calc') === 'moneda') { v.currency = e.target.value; pintar(); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    function programarMedicion() {
      if (emitido || !tocado) return;
      clearTimeout(espera);
      espera = setTimeout(function () {
        emitido = true;
        document.dispatchEvent(new CustomEvent('ailitica:calculadora-completada'));
      }, 3000);
    }

    var copiar = $('[data-calc-copiar]');
    if (copiar) {
      copiar.setAttribute('type', 'button');
      var textoCopiar = copiar.textContent;
      copiar.addEventListener('click', function () {
        var url = location.origin + location.pathname + '#' + serializar();
        var hecho = function () {
          copiar.textContent = 'Enlace copiado ✓';
          setTimeout(function () { copiar.textContent = textoCopiar; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(hecho, function () { history.replaceState(null, '', url); hecho(); });
        } else {
          history.replaceState(null, '', url);
          hecho();
        }
      });
    }

    function serializar() {
      return [
        'horas=' + v.humanHours, 'coste=' + v.hourly, 'reduccion=' + v.timeSaved, 'agente=' + v.agentMonthly,
        'setup=' + v.setup, 'captura=' + v.capture, 'extra=' + v.extraBenefit, 'riesgo=' + v.riskMonthly,
        'moneda=' + v.currency
      ].join('&');
    }

    function pintar() {
      var m = MONEDAS[v.currency] || MONEDAS.EUR;
      var loc = m[0], sym = m[1];
      var dinero = function (n) {
        return new Intl.NumberFormat(loc, { style: 'currency', currency: v.currency, maximumFractionDigits: 0 }).format(n);
      };
      var cifra = function (n, d) { return new Intl.NumberFormat(loc, { maximumFractionDigits: d || 0 }).format(n); };

      var s = Math.min(1, Math.max(0, v.timeSaved / 100)), cap = Math.min(1, Math.max(0, v.capture / 100));
      var liberadas = v.humanHours * s, restantes = v.humanHours - liberadas;
      var valorLaboralM = liberadas * v.hourly * cap, beneficioM = valorLaboralM + v.extraBenefit;
      var beneficioAnual = beneficioM * 12, agenteAnual = v.agentMonthly * 12, riesgoAnual = v.riskMonthly * 12;
      var costeAnio1 = v.setup + agenteAnual + riesgoAnual, neto = beneficioAnual - costeAnio1;
      var roi = costeAnio1 > 0 ? neto / costeAnio1 * 100 : (beneficioAnual > 0 ? 100 : 0);
      var contribM = beneficioM - v.agentMonthly - v.riskMonthly, payback = contribM > 0 ? v.setup / contribM : null;
      var ratio = costeAnio1 > 0 ? beneficioAnual / costeAnio1 : 0;
      var hueco = v.setup + 12 * (v.agentMonthly + v.riskMonthly) - 12 * v.extraBenefit;
      var pleno = 12 * v.humanHours * v.hourly * cap;
      var be = pleno > 0 ? Math.max(0, hueco / pleno) : null;
      var fuerte = roi >= 100, positivo = roi >= 0;
      var color = fuerte ? COLOR.fuerte : positivo ? COLOR.positivo : COLOR.negativo;
      var textoRoi = cifra(roi) + ' %';

      poner('roi', textoRoi);
      var estado = $('[data-calc-out="estado"]');
      if (estado) {
        estado.textContent = fuerte ? 'Caso fuerte' : positivo ? 'ROI positivo' : 'No rentable aún';
        estado.style.background = color;
      }
      poner('resumen', positivo
        ? 'Por cada ' + dinero(1).replace(/[\d.,]+/, '1') + ' invertido en el agente, el modelo estima ' + cifra(ratio, 2) + ' ' + sym + ' de beneficio anual.'
        : 'Con estos datos el agente no se paga en 12 meses. Prueba con más horas, mayor reducción o menor coste.');
      var barra = $('[data-calc-out="barra"]');
      if (barra) {
        barra.style.width = Math.max(0, Math.min(100, ratio * 50)) + '%';
        barra.style.background = color;
      }
      poner('coste-anual', dinero(costeAnio1));
      poner('beneficio-anual', dinero(beneficioAnual));

      poner('m0', dinero(neto));
      poner('m1', payback === null ? 'No recupera' : payback <= 0 ? 'Inmediato' : cifra(payback, 1) + ' meses');
      poner('m2', cifra(liberadas * 12));
      poner('m3', cifra(restantes) + ' h/mes');
      poner('m4', dinero(v.humanHours * v.hourly));
      poner('m5', dinero(restantes * v.hourly + v.agentMonthly + v.riskMonthly));

      poner('f0', dinero(valorLaboralM * 12));
      poner('f1', dinero(v.extraBenefit * 12));
      poner('f2', dinero(agenteAnual));
      poner('f3', dinero(riesgoAnual));
      poner('f4', dinero(v.setup));
      poner('f5', be === null ? 'No alcanzable' : be <= 1 ? cifra(be * 100, 1) + ' %' : '>100 % (no alcanza)');

      $$('[data-calc-unidad]').forEach(function (el) { el.textContent = sym + el.getAttribute('data-calc-unidad'); });
      $$('a[data-calc-contacto]').forEach(function (a) {
        a.setAttribute('href', '/contacto.html#roi=' + encodeURIComponent(textoRoi) + '&horas=' + v.humanHours);
      });
    }

    function poner(clave, texto) {
      var el = $('[data-calc-out="' + clave + '"]');
      if (el) el.textContent = texto;
    }

    pintar();
  }

  function num(el) {
    if (!el) return 0;
    var n = parseFloat(el.value);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function leerAncla() {
    var out = {};
    var h = (location.hash || '').replace(/^#/, '');
    if (!h || h.indexOf('=') < 0) return out;
    h.split('&').forEach(function (par) {
      var i = par.indexOf('=');
      if (i < 1) return;
      try { out[decodeURIComponent(par.slice(0, i))] = decodeURIComponent(par.slice(i + 1)); } catch (e) { /* par ilegible */ }
    });
    return out;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
