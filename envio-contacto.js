/* Envío del formulario de contacto a Formspree (ailitica.com, rediseño f1).
 *
 * Sin JS el formulario sigue funcionando: es un POST normal a Formspree.
 * Con JS se envía por fetch, se enseñan los estados de carga, error y éxito,
 * y solo cuando Formspree responde OK se avisa a consent.js con
 * `ailitica:formulario-enviado`, que es lo que dispara generate_lead (si hay
 * consentimiento). Ningún dato escrito por la persona viaja en ese evento.
 *
 * Mismo comportamiento que el manejador de la home anterior (origin/main):
 * corte a los 15 s para que un envío colgado no deje el botón bloqueado, y el
 * botón se rehabilita al momento tras un error para poder reintentar.
 */
(function () {
  'use strict';

  var CORTE_MS = 15000;

  function cablear(form) {
    var boton = form.querySelector('button[type="submit"]');
    var estado = form.querySelector('[data-form-estado]');
    if (!boton) return;
    var textoBoton = boton.textContent;
    var estiloBoton = boton.getAttribute('style') || '';

    function mostrarEstado(tipo, texto) {
      if (!estado) return;
      estado.hidden = false;
      estado.setAttribute('data-tipo', tipo);
      estado.style.color = tipo === 'error' ? '#C7362F' : '#1F6FEB';
      estado.textContent = texto;
    }

    function restaurarBoton() {
      boton.textContent = textoBoton;
      boton.setAttribute('style', estiloBoton);
      boton.disabled = false;
      form.removeAttribute('aria-busy');
    }

    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData) return; // envío nativo
      e.preventDefault();
      if (boton.disabled) return;

      boton.disabled = true;
      boton.textContent = 'Enviando…';
      boton.style.opacity = '.7';
      form.setAttribute('aria-busy', 'true');
      if (estado) { estado.hidden = true; estado.textContent = ''; }

      var corte = window.AbortController ? new AbortController() : null;
      var temporizador = setTimeout(function () { if (corte) corte.abort(); }, CORTE_MS);

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
        signal: corte ? corte.signal : undefined
      }).then(function (res) {
        if (!res.ok) throw new Error('envio');
        // Conversión real: Formspree ha aceptado el mensaje.
        document.dispatchEvent(new CustomEvent('ailitica:formulario-enviado', {
          detail: { form_id: form.getAttribute('data-form-contacto') || 'contacto' }
        }));
        form.reset();
        restaurarBoton();
        mostrarEstado('ok', 'Mensaje enviado. Gracias: te respondemos por correo lo antes posible.');
      }).catch(function () {
        restaurarBoton();
        mostrarEstado('error', 'No se ha podido enviar. Inténtalo de nuevo o escríbenos a hola@ailitica.com.');
      }).then(function () {
        clearTimeout(temporizador);
      });
    });
  }

  function iniciar() {
    var forms = document.querySelectorAll('form[data-form-contacto]');
    for (var i = 0; i < forms.length; i++) cablear(forms[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
