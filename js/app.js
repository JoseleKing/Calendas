// Arranque: decide qué día es, carga el duelo y muestra o la pregunta o el
// resultado ya jugado. Con ?duelo=N se juega un duelo anterior del archivo.

import {
  FECHA_LANZAMIENTO,
  esFechaValida,
  fechaLarga,
  fechaMadrid,
  msHastaProximoDuelo,
  numeroDuelo,
  sumarDias,
} from './fecha.js';
import { cargarBanco, elegirDuelo } from './duelos.js';
import * as estadisticas from './estadisticas.js';
import { enviarRespuesta, pedirTotales } from './api.js';
import { revelar } from './revelacion.js';
import { compartir, textoCompartir } from './compartir.js';

const $ = (selector) => document.querySelector(selector);

// Modo desarrollo: ?fecha=AAAA-MM-DD simula otro día, usa estadísticas aparte
// y no envía nada al backend.
const parametros = new URLSearchParams(location.search);
const parametroFecha = parametros.get('fecha');
const modoDesarrollo = parametroFecha !== null && esFechaValida(parametroFecha);
if (parametroFecha !== null && !modoDesarrollo) {
  console.warn(`Calendas: ?fecha=${parametroFecha} no es válida; usa el formato AAAA-MM-DD.`);
}
if (modoDesarrollo) estadisticas.usarModoDesarrollo();

const hoy = modoDesarrollo ? parametroFecha : fechaMadrid();
const fecha = fechaDelArchivo(parametros.get('duelo')) ?? hoy;
const esArchivo = fecha !== hoy;
const numero = numeroDuelo(fecha);

let seleccion = null;
let porcentajeHoy = null;
let cuentaAtrasActiva = false;

retirarPortada();
iniciar();

/** ?duelo=N abre un duelo anterior: del #1 al de ayer. Cualquier otro valor lleva al de hoy. */
function fechaDelArchivo(valor) {
  if (valor === null) return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1 || n >= numeroDuelo(hoy)) return null;
  return sumarDias(FECHA_LANZAMIENTO, n - 1);
}

/** Enlace a un duelo (sin número: el de hoy), conservando el ?fecha= del modo desarrollo. */
function enlaceDuelo(n) {
  const destino = new URLSearchParams();
  if (modoDesarrollo) destino.set('fecha', hoy);
  if (n) destino.set('duelo', n);
  const consulta = destino.toString();
  return consulta ? `?${consulta}` : location.pathname;
}

/**
 * La portada con el logo se ve al menos PORTADA_MS desde que se abre la app y luego se desvanece.
 * Los estilos (fuentes de Google incluidas) bloquean el primer pintado, y este script corre cuando
 * ya han cargado: con red lenta se garantiza además que se vea VISIBLE_MS desde ese momento.
 */
function retirarPortada() {
  const PORTADA_MS = 1300;
  const VISIBLE_MS = 800;
  const FUNDIDO_MS = 400;
  const portada = document.getElementById('portada');
  if (!portada) return;
  // Solo una vez por sesión: al moverse por el archivo no vuelve a salir.
  try {
    sessionStorage.setItem('calendas:portada', '1');
  } catch {
    // Sin sessionStorage la portada sale en cada carga; no pasa nada.
  }
  if (document.documentElement.classList.contains('sin-portada')) {
    portada.remove();
    return;
  }
  setTimeout(() => {
    portada.classList.add('oculta');
    setTimeout(() => portada.remove(), FUNDIDO_MS);
  }, Math.max(VISIBLE_MS, PORTADA_MS - performance.now()));
}

async function iniciar() {
  $('#numero').textContent = `${esArchivo ? 'Archivo · ' : ''}Duelo n.º ${numero}`;
  $('#fecha-larga').textContent = fechaLarga(fecha);
  if (modoDesarrollo) {
    $('#barra-dev').hidden = false;
    $('#dev-fecha').textContent = hoy;
  }
  if (esArchivo) {
    const volver = $('#volver');
    volver.href = enlaceDuelo();
    volver.hidden = false;
  }
  pintarEstadisticas();
  prepararArchivo();
  $('#compartir').addEventListener('click', alCompartir);
  document.addEventListener('visibilitychange', recargarSiCambioElDia);

  try {
    seleccion = elegirDuelo(await cargarBanco(), fecha);
  } catch (error) {
    console.error(error);
    $('#instruccion').textContent = 'No se ha podido cargar el duelo. Prueba a recargar la página.';
    return;
  }

  const botones = document.querySelectorAll('.carta');
  seleccion.cartas.forEach((carta, i) => {
    botones[i].querySelector('.carta-palabra').textContent = carta.palabra;
  });

  const partida = estadisticas.partidaDe(fecha);
  if (partida) {
    mostrarResultado(partida.eleccion, false);
    sincronizarPorcentaje(partida);
    return;
  }

  $('#duelo').classList.add('listo');
  botones.forEach((boton, i) => {
    boton.disabled = false;
    boton.addEventListener('click', () => responder(seleccion.cartas[i].palabra));
  });
}

function responder(palabra) {
  if (estadisticas.partidaDe(fecha)) return;
  const acierto = palabra === seleccion.correcta;
  const partida = estadisticas.registrarPartida(fecha, {
    dueloId: seleccion.duelo.id,
    eleccion: palabra,
    acierto,
    archivo: esArchivo,
  });
  mostrarResultado(palabra, true);
  pintarEstadisticas();
  sincronizarPorcentaje(partida);
}

function mostrarResultado(eleccion, animar) {
  revelar({
    cartas: seleccion.cartas,
    eleccion,
    correcta: seleccion.correcta,
    curiosidad: seleccion.duelo.curiosidad,
    animar,
  });
  if (esArchivo) $('#cuenta-atras').hidden = true;
  else iniciarCuentaAtras();
}

/**
 * Envía la respuesta si aún no consta en el servidor y muestra el % global.
 * Las partidas del archivo no se envían: el % de un día es el de quienes lo jugaron ese día.
 */
async function sincronizarPorcentaje(partida) {
  if (modoDesarrollo) return;
  const enviar = !esArchivo && !partida.enviada;
  const totales = enviar ? await enviarRespuesta(fecha, partida.eleccion) : await pedirTotales(fecha);
  if (!totales) return;
  if (enviar) estadisticas.marcarEnviada(fecha);
  if (totales.total === 0) return;

  porcentajeHoy = Math.round((totales.aciertos / totales.total) * 100);
  const el = $('#porcentaje');
  el.textContent = `El ${porcentajeHoy} % de los jugadores acertó ${esArchivo ? 'ese día' : 'hoy'}`;
  el.hidden = false;
}

function pintarEstadisticas() {
  const e = estadisticas.leer();
  const racha = estadisticas.rachaActual(hoy);
  $('#racha').textContent = racha;
  $('#racha-texto').textContent = racha === 1 ? 'día de racha' : 'días de racha';
  $('#st-mejor').textContent = e.mejorRacha;
  $('#st-jugados').textContent = e.jugados;
  $('#st-aciertos').textContent = e.jugados ? `${Math.round((e.aciertos / e.jugados) * 100)} %` : '—';
}

function formatoCuenta(ms) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function iniciarCuentaAtras() {
  if (cuentaAtrasActiva) return;
  cuentaAtrasActiva = true;
  const el = $('#cuenta');
  const tic = () => {
    const ms = msHastaProximoDuelo();
    el.textContent = formatoCuenta(ms);
    if (ms <= 0 && !modoDesarrollo) location.reload();
  };
  tic();
  setInterval(tic, 1000);
}

/** Si la app se queda abierta y pasa la medianoche, carga el duelo nuevo al volver. */
function recargarSiCambioElDia() {
  if (!modoDesarrollo && document.visibilityState === 'visible' && fechaMadrid() !== hoy) {
    location.reload();
  }
}

async function alCompartir() {
  const partida = estadisticas.partidaDe(fecha);
  if (!partida) return;
  const texto = textoCompartir({
    numero,
    acierto: partida.acierto,
    porcentaje: porcentajeHoy,
    racha: estadisticas.rachaActual(hoy),
  });
  const resultado = await compartir(texto);
  const aviso = $('#aviso');
  aviso.textContent =
    resultado === 'copiado' ? 'Copiado al portapapeles' : resultado === 'error' ? `No se pudo copiar: ${texto}` : '';
  clearTimeout(alCompartir.temporizador);
  alCompartir.temporizador = setTimeout(() => (aviso.textContent = ''), 4000);
}

/** Botón «Duelos anteriores»: solo aparece cuando ya hay algún día pasado. */
function prepararArchivo() {
  const ultimo = numeroDuelo(hoy) - 1;
  if (ultimo < 1) return;
  const dialogo = $('#archivo');
  const boton = $('#abrir-archivo');
  boton.hidden = false;
  boton.addEventListener('click', () => {
    pintarArchivo(ultimo);
    dialogo.showModal();
    dialogo.querySelector('.actual, a')?.scrollIntoView({ block: 'center' });
  });
  $('#cerrar-archivo').addEventListener('click', () => dialogo.close());
  // Tocar fuera de la ficha (en el fondo) también cierra.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
}

function pintarArchivo(ultimo) {
  const lista = $('#archivo-lista');
  lista.replaceChildren();
  for (let n = ultimo; n >= 1; n--) {
    const dia = sumarDias(FECHA_LANZAMIENTO, n - 1);
    const partida = estadisticas.partidaDe(dia);
    const estado = !partida ? 'Jugar' : partida.acierto ? 'Acertado' : 'Fallado';
    const enlace = document.createElement('a');
    enlace.href = enlaceDuelo(n);
    enlace.className = `archivo-dia${dia === fecha ? ' actual' : ''}`;
    if (dia === fecha) enlace.setAttribute('aria-current', 'page');
    for (const [clase, texto] of [
      ['archivo-numero', `#${n}`],
      ['archivo-fecha', fechaLarga(dia)],
      [`archivo-estado ${!partida ? 'pendiente' : partida.acierto ? 'acertado' : 'fallado'}`, estado],
    ]) {
      const span = document.createElement('span');
      span.className = clase;
      span.textContent = texto;
      enlace.append(span);
    }
    const elemento = document.createElement('li');
    elemento.append(enlace);
    lista.append(elemento);
  }
}
