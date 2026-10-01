/* Volver a Almanaque
   Muestra una franja con una mano ☜ en lo alto del juego para regresar a Almanaque.
   Solo aparece si se llegó desde Almanaque (que añade ?desde=almanaque al enlace)
   y se mantiene mientras siga abierta esa pestaña.
   Copia de referencia: se guarda en el repo de Almanaque, en para-los-juegos/.
   Cada juego incluye su propia copia con:
   <script src="volver-almanaque.js" defer></script> */
(function () {
  'use strict';

  var ALMANAQUE = 'https://joseleking.github.io/Almanaque/';
  var CLAVE = 'almanaque:volver';
  var desdeAlmanaque = false;

  try {
    var url = new URL(window.location.href);
    if (url.searchParams.get('desde') === 'almanaque') {
      desdeAlmanaque = true;
      // Limpia la dirección para que no se comparta con el parámetro.
      url.searchParams.delete('desde');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  } catch (e) { /* navegador antiguo: se ignora */ }

  try {
    if (desdeAlmanaque) window.sessionStorage.setItem(CLAVE, '1');
    else desdeAlmanaque = window.sessionStorage.getItem(CLAVE) === '1';
  } catch (e) { /* sin almacenamiento: vale con el parámetro */ }

  if (!desdeAlmanaque) return;

  function mostrar() {
    if (document.getElementById('almanaque-volver')) return;

    var estilo = document.createElement('style');
    estilo.textContent =
      '#almanaque-volver{display:flex;align-items:center;gap:.45em;box-sizing:border-box;width:100%;' +
      'margin:0;padding:.4rem max(1rem,env(safe-area-inset-right)) .4rem max(1rem,env(safe-area-inset-left));' +
      'padding-top:max(.4rem,env(safe-area-inset-top));' +
      'font:inherit;font-size:.9rem;line-height:1.2;letter-spacing:.06em;font-variant:small-caps;' +
      'color:inherit;text-decoration:none;opacity:.78;position:relative;z-index:1;' +
      'border-bottom:1px solid currentColor;border-bottom-color:color-mix(in srgb,currentColor 18%,transparent);' +
      '-webkit-tap-highlight-color:transparent}' +
      '#almanaque-volver:hover,#almanaque-volver:focus-visible{opacity:1}' +
      '#almanaque-volver:focus-visible{outline:2px solid currentColor;outline-offset:-4px}' +
      '#almanaque-volver .almanaque-volver__mano{font-size:1.7em;line-height:.8;font-variant:normal;' +
      'transition:transform .18s ease}' +
      '#almanaque-volver:hover .almanaque-volver__mano{transform:translateX(-3px)}' +
      '@media (prefers-reduced-motion:reduce){#almanaque-volver .almanaque-volver__mano{transition:none}}';
    document.head.appendChild(estilo);

    var enlace = document.createElement('a');
    enlace.id = 'almanaque-volver';
    enlace.href = ALMANAQUE;
    enlace.setAttribute('aria-label', 'Volver a Almanaque');

    var mano = document.createElement('span');
    mano.className = 'almanaque-volver__mano';
    mano.setAttribute('aria-hidden', 'true');
    mano.textContent = '☜';

    enlace.appendChild(mano);
    enlace.appendChild(document.createTextNode('Almanaque'));
    document.body.insertBefore(enlace, document.body.firstChild);
  }

  if (document.body) mostrar();
  else document.addEventListener('DOMContentLoaded', mostrar);
})();
