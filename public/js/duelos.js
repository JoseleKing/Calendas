// Banco de duelos y elección determinista del duelo del día.
// Módulo puro salvo `cargarBanco`: el Worker de Cloudflare reutiliza `elegirDuelo`
// para saber cuál es la respuesta correcta sin fiarse del cliente.

import { diaSemana, indiceDia, semanaDesdeLanzamiento } from './fecha.js';

const modulo = (n, m) => ((n % m) + m) % m;

/** Hash FNV-1a de 32 bits: estable entre navegadores y Node. */
function hash(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * El día de la semana fija la dificultad (lunes 1 … domingo 7). Dentro de esa
 * dificultad se rota semana a semana por orden de id. El orden de las cartas
 * también depende de la fecha, para que la correcta no salga siempre arriba.
 */
export function elegirDuelo(duelos, fecha) {
  let candidatos = duelos.filter((d) => d.dificultad === diaSemana(fecha));
  let indice = semanaDesdeLanzamiento(fecha);
  if (candidatos.length === 0) {
    candidatos = duelos;
    indice = indiceDia(fecha);
  }
  candidatos = [...candidatos].sort((a, b) => a.id - b.id);
  const duelo = candidatos[modulo(indice, candidatos.length)];

  const a = { palabra: duelo.palabraA, anio: duelo.anioA };
  const b = { palabra: duelo.palabraB, anio: duelo.anioB };
  return {
    duelo,
    cartas: hash(fecha) % 2 ? [b, a] : [a, b],
    correcta: duelo.anioA < duelo.anioB ? duelo.palabraA : duelo.palabraB,
  };
}

/** Avisos sobre errores típicos al editar el JSON a mano. */
export function validarBanco(duelos) {
  const avisos = [];
  const ids = new Set();
  for (const d of duelos) {
    const nombre = `duelo ${d.id} (${d.palabraA} / ${d.palabraB})`;
    if (ids.has(d.id)) avisos.push(`id repetido: ${nombre}`);
    ids.add(d.id);
    for (const campo of ['id', 'palabraA', 'anioA', 'palabraB', 'anioB', 'dificultad', 'curiosidad']) {
      if (d[campo] === undefined || d[campo] === '') avisos.push(`falta "${campo}" en ${nombre}`);
    }
    if (d.anioA === d.anioB) avisos.push(`años empatados en ${nombre}: no hay respuesta correcta`);
    if (!Number.isInteger(d.dificultad) || d.dificultad < 1 || d.dificultad > 7) {
      avisos.push(`dificultad fuera de 1-7 en ${nombre}`);
    }
  }
  for (let dificultad = 1; dificultad <= 7; dificultad++) {
    if (!duelos.some((d) => d.dificultad === dificultad)) avisos.push(`no hay duelos de dificultad ${dificultad}`);
  }
  const sinVerificar = duelos.filter((d) => d.verificado !== true).length;
  if (sinVerificar) avisos.push(`${sinVerificar} duelos con fechas sin verificar`);
  return avisos;
}

export async function cargarBanco(url = 'data/duelos.json') {
  const respuesta = await fetch(url, { cache: 'no-cache' });
  if (!respuesta.ok) throw new Error(`No se pudo cargar el banco de duelos (${respuesta.status})`);
  const { duelos } = await respuesta.json();
  for (const aviso of validarBanco(duelos)) console.warn(`Calendas: ${aviso}`);
  return duelos;
}
