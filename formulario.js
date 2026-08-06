/* ===========================================================================
   formulario.js — envío de los formularios de contacto de ailitica.com

   Un solo fichero para las tres páginas (home, contacto, sensor). La lógica de
   errores es delicada y tres copias divergirían: la primera que se toque dejará
   de cumplir alguna de las seis reglas de abajo y nadie se enterará.

   Contrato del endpoint: 04_operaciones/herramientas/formulario_web/README.md
   Dueño del servicio: Codex. Revisión de seguridad del diseño: Escudo.

   POST https://formulario.ailitica.com/enviar
   Content-Type: application/json; charset=utf-8

   La cabecera JSON no es decorativa: obliga al navegador a hacer la
   comprobación previa (preflight), y eso es lo que impide que otra web envíe
   el formulario en nombre de un visitante. Un <form action=...> clásico manda
   otro tipo de contenido y recibe un 415.

   LAS SEIS REGLAS, que es lo que este fichero existe para garantizar:

     1. Nunca se sale de ailitica.com. La confirmación se pinta aquí.
     2. Ante cualquier error, el texto del visitante NO se borra.
     3. En 502 y 503 se ofrece hola@ailitica.com como alternativa real.
     4. Se tolera que la respuesta no sea JSON: si salta el tiempo de espera de
        Cloudflare llega una página HTML de error, y un response.json() a ciegas
        revienta ahí sin que el visitante vea nada.
     5. Solo se dice "enviado" con un 200. Sin matices. Es el defecto que costó
        seis semanas de datos en junio.
     6. El código de la cabecera X-Traza se enseña en los errores: permite
        averiguar qué pasó sin guardar ni un dato del visitante.
   =========================================================================== */

(function () {
  'use strict';

  var ENDPOINT = 'https://formulario.ailitica.com/enviar';
  var CORREO = 'hola@ailitica.com';

  /* El guardián responde de forma síncrona: valida, reenvía a n8n y espera a
     que el correo salga de verdad antes de contestar. Por eso el tiempo de
     espera es holgado; cortar a los 10 s daría por fallidos envíos que sí van
     a completarse. */
  var ESPERA_MS = 30000;

  /* Momento de carga de la página. La diferencia con el envío viaja en `_t` y
     sirve al servidor para marcar (no descartar) los envíos instantáneos. */
  var CARGA = Date.now();

  var CAMPOS = ['nombre', 'email', 'empresa', 'mensaje'];

  function texto(el) {
    return el && typeof el.value === 'string' ? el.value : '';
  }

  function limpiarErroresDeCampo(form) {
    CAMPOS.forEach(function (nombre) {
      var campo = form.elements[nombre];
      if (!campo) return;
      campo.removeAttribute('aria-invalid');
      campo.classList.remove('campo-error');
      var aviso = form.querySelector('[data-error-de="' + nombre + '"]');
      if (aviso) aviso.remove();
    });
  }

  /* Los mensajes por campo los redacta el servidor en español y ya vienen
     pensados para enseñarse tal cual (validacion.py, Resultado.errores). No se
     traducen ni se reescriben aquí: duplicar esos textos es garantizar que un
     día digan cosas distintas. */
  function pintarErroresDeCampo(form, campos) {
    var primero = null;
    Object.keys(campos || {}).forEach(function (nombre) {
      var campo = form.elements[nombre];
      if (!campo) return;
      campo.setAttribute('aria-invalid', 'true');
      campo.classList.add('campo-error');
      var aviso = document.createElement('p');
      aviso.className = 'form-error-campo';
      aviso.setAttribute('data-error-de', nombre);
      aviso.textContent = String(campos[nombre]);
      if (campo.parentNode) campo.parentNode.insertBefore(aviso, campo.nextSibling);
      if (!primero) primero = campo;
    });
    if (primero && typeof primero.focus === 'function') primero.focus();
    return primero;
  }

  function pintarResultado(form, tipo, nodos) {
    var caja = form.querySelector('[data-form-resultado]');
    if (!caja) return;
    caja.className = 'form-resultado form-resultado--' + tipo;
    caja.textContent = '';
    nodos.forEach(function (n) {
      caja.appendChild(typeof n === 'string' ? document.createTextNode(n) : n);
    });
  }

  function enlaceCorreo() {
    var a = document.createElement('a');
    a.href = 'mailto:' + CORREO;
    a.textContent = CORREO;
    return a;
  }

  function codigoDeTraza(traza) {
    if (!traza) return null;
    var span = document.createElement('span');
    span.className = 'form-traza';
    span.textContent = ' (código ' + traza + ')';
    return span;
  }

  /* Regla 4. Si el cuerpo no es JSON (página de error de Cloudflare, respuesta
     vacía, cuerpo truncado) devolvemos un objeto vacío en vez de reventar. */
  function leerJson(res) {
    return res.text().then(function (crudo) {
      if (!crudo) return {};
      try {
        var datos = JSON.parse(crudo);
        return datos && typeof datos === 'object' ? datos : {};
      } catch (e) {
        return {};
      }
    }, function () {
      return {};
    });
  }

  function manejar(form) {
    var boton = form.querySelector('[data-form-enviar]');
    var textoBoton = boton ? boton.textContent : '';
    var enviando = false;

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();          // Regla 1: no se sale de la página.
      if (enviando) return;
      enviando = true;

      limpiarErroresDeCampo(form);
      pintarResultado(form, 'cargando', ['Enviando tu mensaje…']);
      if (boton) {
        boton.disabled = true;
        boton.textContent = 'Enviando…';
      }

      var carga = {
        nombre: texto(form.elements.nombre).trim(),
        email: texto(form.elements.email).trim(),
        empresa: texto(form.elements.empresa).trim(),
        mensaje: texto(form.elements.mensaje).trim(),
        origen: form.getAttribute('data-origen') || 'desconocido',
        _hp_a: texto(form.elements._hp_a),
        _t: Date.now() - CARGA
      };

      var aborto = new AbortController();
      var reloj = setTimeout(function () { aborto.abort(); }, ESPERA_MS);

      function terminar() {
        clearTimeout(reloj);
        enviando = false;
        if (boton) {
          boton.disabled = false;
          boton.textContent = textoBoton;
        }
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(carga),
        signal: aborto.signal
      }).then(function (res) {
        var traza = res.headers.get('X-Traza');
        return leerJson(res).then(function (cuerpo) {
          terminar();

          /* Regla 5. "Enviado" SOLO con 200. No `res.ok`, que abarca todo el
             rango 2xx, ni la sola presencia de `ok` en el cuerpo. */
          if (res.status === 200 && cuerpo.ok === true) {
            form.reset();
            pintarResultado(form, 'ok', [
              'Mensaje enviado. Te respondemos al correo que nos has dejado.'
            ]);
            return;
          }

          // Regla 2: a partir de aquí NO se toca el contenido del formulario.

          if (res.status === 400 && cuerpo.error === 'validacion' && cuerpo.campos) {
            pintarErroresDeCampo(form, cuerpo.campos);
            pintarResultado(form, 'error', [
              'Revisa los campos marcados y vuelve a enviarlo.'
            ]);
            return;
          }

          if (res.status === 413) {
            pintarResultado(form, 'error', [
              'El mensaje es demasiado largo. Acórtalo y vuelve a enviarlo, o ',
              'escríbenos a ', enlaceCorreo(), '.'
            ]);
            return;
          }

          if (res.status === 429) {
            var espera = typeof cuerpo.reintentar_en === 'number' && cuerpo.reintentar_en > 0
              ? 'Espera ' + cuerpo.reintentar_en + ' segundos y vuelve a intentarlo.'
              : 'Espera un momento y vuelve a intentarlo.';
            pintarResultado(form, 'error', [
              'Has enviado varios mensajes seguidos. ' + espera
            ]);
            return;
          }

          /* Regla 3. 502 (el correo no ha salido) y 503 (saturado). No es un
             "inténtalo más tarde": es un camino alternativo que funciona hoy. */
          if (res.status === 502 || res.status === 503) {
            var nodos = [
              'No hemos podido entregar tu mensaje. Escríbenos directamente a ',
              enlaceCorreo(), ' y lo vemos igual.'
            ];
            var codigo = codigoDeTraza(traza);
            if (codigo) nodos.push(codigo);
            pintarResultado(form, 'error', nodos);
            return;
          }

          // Cualquier otro código: genérico, con traza y con alternativa.
          var otros = [
            'No hemos podido enviar tu mensaje. Puedes escribirnos a ',
            enlaceCorreo(), '.'
          ];
          var codigoOtros = codigoDeTraza(traza);
          if (codigoOtros) otros.push(codigoOtros);
          pintarResultado(form, 'error', otros);
        });
      }).catch(function (error) {
        terminar();

        /* Sin respuesta no sabemos si el correo salió o no: puede haberse
           entregado y habérsenos caído la conexión al recibir la respuesta.
           Decir "no se ha enviado" sería tan falso como decir "enviado", así
           que se dice exactamente lo que se sabe. */
        var esTiempo = error && error.name === 'AbortError';
        pintarResultado(form, 'error', [
          esTiempo
            ? 'El envío está tardando demasiado y no hemos podido confirmarlo. '
            : 'No hemos podido conectar y no hemos podido confirmar el envío. ',
          'Para asegurarte, escríbenos a ', enlaceCorreo(), '.'
        ]);
      });
    });
  }

  function iniciar() {
    var formularios = document.querySelectorAll('form[data-form-contacto]');
    for (var i = 0; i < formularios.length; i++) manejar(formularios[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
