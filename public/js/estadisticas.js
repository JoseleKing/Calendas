// Estadísticas locales. Si localStorage no está disponible (modo privado,
// datos bloqueados…) todo sigue funcionando en memoria durante la sesión.

import { sumarDias } from './fecha.js';

const CLAVE_BASE = 'calendas:v1';
let clave = CLAVE_BASE;
let estado = null;

/** En modo desarrollo se usa otra clave para no ensuciar las estadísticas reales. */
export function usarModoDesarrollo() {
  clave = `${CLAVE_BASE}:dev`;
  estado = null;
}

const vacio = () => ({ racha: 0, mejorRacha: 0, ultimoDia: null, jugados: 0, aciertos: 0, partidas: {} });

export function leer() {
  if (estado) return estado;
  try {
    const guardado = JSON.parse(localStorage.getItem(clave));
    estado = guardado && typeof guardado === 'object' ? { ...vacio(), ...guardado } : vacio();
  } catch {
    estado = vacio();
  }
  return estado;
}

function guardar() {
  try {
    localStorage.setItem(clave, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento persistente: nos quedamos con la copia en memoria.
  }
}

export function partidaDe(fecha) {
  return leer().partidas[fecha] ?? null;
}

/**
 * Fallar no rompe la racha; solo la rompe saltarse un día. Los duelos del
 * archivo suman a jugados y aciertos, pero no a la racha: esta cuenta los días
 * en que se jugó el duelo de ese mismo día.
 */
export function registrarPartida(fecha, { dueloId, eleccion, acierto, archivo = false }) {
  const e = leer();
  if (e.partidas[fecha]) return e.partidas[fecha];

  // La comparación de cadenas AAAA-MM-DD es cronológica. Jugar una fecha
  // anterior a la última (solo posible con ?fecha=) no toca la racha.
  if (!archivo && (!e.ultimoDia || fecha > e.ultimoDia)) {
    e.racha = e.ultimoDia === sumarDias(fecha, -1) ? e.racha + 1 : 1;
    e.mejorRacha = Math.max(e.mejorRacha, e.racha);
    e.ultimoDia = fecha;
  }
  e.jugados += 1;
  if (acierto) e.aciertos += 1;
  e.partidas[fecha] = { dueloId, eleccion, acierto, archivo, enviada: false };
  guardar();
  return e.partidas[fecha];
}

export function marcarEnviada(fecha) {
  const partida = partidaDe(fecha);
  if (!partida) return;
  partida.enviada = true;
  guardar();
}

/** Racha vigente a fecha de hoy: si ayer no se jugó, ya está rota. */
export function rachaActual(fecha) {
  const { ultimoDia, racha } = leer();
  return ultimoDia === fecha || ultimoDia === sumarDias(fecha, -1) ? racha : 0;
}
