// Revelación tras responder: años en las cartas, sello, veredicto, línea de
// tiempo y curiosidad. Las animaciones viven en CSS; aquí solo se ponen clases.

const $ = (selector) => document.querySelector(selector);

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/** Escala con 2-6 marcas en números redondos que abarque los dos años. */
function escala(desde, hasta) {
  for (const paso of [50, 100, 200, 250, 500, 1000]) {
    const inicio = Math.floor(desde / paso) * paso;
    let fin = Math.ceil(hasta / paso) * paso;
    if (fin === inicio) fin += paso;
    if ((fin - inicio) / paso <= 6) return { inicio, fin, paso };
  }
  return { inicio: desde, fin: hasta, paso: hasta - desde };
}

function hito(carta, lado, posicion) {
  const el = crear('div', `hito hito-${lado}`);
  el.style.left = `${posicion}%`;
  if (posicion < 15) el.classList.add('al-inicio');
  else if (posicion > 85) el.classList.add('al-final');
  const texto = crear('div', 'hito-texto');
  texto.append(crear('span', 'hito-palabra', carta.palabra), crear('span', 'hito-anio', String(carta.anio)));
  el.append(crear('span', 'hito-tallo'), crear('span', 'hito-punto'), texto);
  return el;
}

function pintarLinea(contenedor, antigua, reciente) {
  const { inicio, fin, paso } = escala(antigua.anio, reciente.anio);
  const posicion = (anio) => ((anio - inicio) / (fin - inicio)) * 100;

  contenedor.replaceChildren(crear('div', 'linea-eje'));
  for (let anio = inicio; anio <= fin; anio += paso) {
    const marca = crear('span', 'linea-marca');
    marca.style.left = `${posicion(anio)}%`;
    // Sin rótulo si choca con el tallo de la palabra reciente, que baja por debajo del eje.
    if (Math.abs(posicion(anio) - posicion(reciente.anio)) > 9) marca.dataset.anio = anio;
    contenedor.append(marca);
  }
  contenedor.append(
    hito(antigua, 'arriba', posicion(antigua.anio)),
    hito(reciente, 'abajo', posicion(reciente.anio)),
  );
  contenedor.setAttribute(
    'aria-label',
    `Línea de tiempo: ${antigua.palabra} en ${antigua.anio}, ${reciente.palabra} en ${reciente.anio}`,
  );
}

export function revelar({ cartas, eleccion, correcta, curiosidad, animar }) {
  document.body.classList.toggle('sin-animacion', !animar);

  const duelo = $('#duelo');
  duelo.querySelectorAll('.carta').forEach((boton, i) => {
    const carta = cartas[i];
    boton.disabled = true;
    boton.querySelector('.carta-anio').textContent = carta.anio;
    boton.classList.toggle('elegida', carta.palabra === eleccion);
    boton.classList.toggle('correcta', carta.palabra === correcta);
    boton.setAttribute('aria-label', `${carta.palabra}: ${carta.anio}`);
  });
  duelo.classList.add('respondido');
  $('#instruccion').textContent = 'Año de primera documentación en español';

  const acierto = eleccion === correcta;
  const [antigua, reciente] = [...cartas].sort((a, b) => a.anio - b.anio);
  const diferencia = reciente.anio - antigua.anio;

  const veredicto = $('#veredicto');
  veredicto.textContent = acierto ? '¡Acertaste!' : 'Esta vez no';
  veredicto.classList.add(acierto ? 'es-acierto' : 'es-fallo');
  $('#detalle').textContent =
    `«${antigua.palabra}» se documenta ${diferencia} ${diferencia === 1 ? 'año' : 'años'} antes que «${reciente.palabra}».`;
  $('#curiosidad').textContent = curiosidad;
  pintarLinea($('#linea'), antigua, reciente);

  const resultado = $('#resultado');
  resultado.hidden = false;
  // Dos frames para que el navegador pinte el estado inicial antes de animar.
  requestAnimationFrame(() => requestAnimationFrame(() => resultado.classList.add('visible')));

  if (animar) {
    setTimeout(() => resultado.scrollIntoView({ behavior: 'smooth', block: 'start' }), 1100);
  }
}
