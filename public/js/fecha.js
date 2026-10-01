// Utilidades de fecha. Una "fecha de juego" es siempre una cadena 'AAAA-MM-DD'
// referida al calendario de Madrid. Módulo puro: lo usan el navegador y la
// Worker de Cloudflare, así que no debe tocar `window` ni `document`.

export const ZONA = 'Europe/Madrid';
export const FECHA_LANZAMIENTO = '2026-10-01';

const MS_DIA = 86_400_000;

const formatoMadrid = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partesMadrid(ms) {
  const partes = {};
  for (const { type, value } of formatoMadrid.formatToParts(ms)) partes[type] = Number(value);
  return partes;
}

const dosCifras = (n) => String(n).padStart(2, '0');

/** Fecha de juego actual (o del instante `ms`) en Madrid. */
export function fechaMadrid(ms = Date.now()) {
  const { year, month, day } = partesMadrid(ms);
  return `${year}-${dosCifras(month)}-${dosCifras(day)}`;
}

export function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  return desdeIndice(indiceDia(fecha)) === fecha;
}

/** Días transcurridos desde 1970-01-01 (sin horas ni zonas de por medio). */
export function indiceDia(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia) / MS_DIA;
}

function desdeIndice(indice) {
  return new Date(indice * MS_DIA).toISOString().slice(0, 10);
}

export function sumarDias(fecha, dias) {
  return desdeIndice(indiceDia(fecha) + dias);
}

/** 1 = lunes … 7 = domingo. */
export function diaSemana(fecha) {
  return ((new Date(indiceDia(fecha) * MS_DIA).getUTCDay() + 6) % 7) + 1;
}

/** Número de duelo: el día del lanzamiento es el #1. */
export function numeroDuelo(fecha) {
  return indiceDia(fecha) - indiceDia(FECHA_LANZAMIENTO) + 1;
}

/** Semanas (de lunes a domingo) transcurridas desde la semana del lanzamiento. */
export function semanaDesdeLanzamiento(fecha) {
  const lunes = (f) => indiceDia(f) - (diaSemana(f) - 1);
  return Math.floor((lunes(fecha) - lunes(FECHA_LANZAMIENTO)) / 7);
}

/** Diferencia en ms entre la hora de Madrid y UTC en el instante `ms`. */
function desfaseMadrid(ms) {
  const p = partesMadrid(ms);
  const comoUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return comoUTC - Math.floor(ms / 1000) * 1000;
}

/** Instante (ms UTC) de la medianoche de Madrid que abre `fecha`. Tiene en cuenta el horario de verano. */
function medianocheMadrid(fecha) {
  const aproximado = indiceDia(fecha) * MS_DIA;
  const primeraEstimacion = aproximado - desfaseMadrid(aproximado);
  return aproximado - desfaseMadrid(primeraEstimacion);
}

export function msHastaProximoDuelo(ahora = Date.now()) {
  return medianocheMadrid(sumarDias(fechaMadrid(ahora), 1)) - ahora;
}

const formatoLargo = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** 'jueves, 1 de octubre' */
export function fechaLarga(fecha) {
  return formatoLargo.format(indiceDia(fecha) * MS_DIA);
}
