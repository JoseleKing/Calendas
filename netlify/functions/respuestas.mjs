// Contador global de respuestas por día.
//
//   GET  /api/respuestas?fecha=AAAA-MM-DD     → { aciertos, total }
//   POST /api/respuestas { fecha, palabra }   → { aciertos, total } (ya incluyendo esta respuesta)
//
// Cada respuesta se guarda como una clave independiente en Netlify Blobs
// ("AAAA-MM-DD/1/<uuid>" si acertó, ".../0/<uuid>" si falló) y los totales se
// obtienen listando el prefijo del día. Así no hay lecturas-modificaciones-
// escrituras concurrentes que pierdan respuestas. El acierto se calcula aquí
// con el mismo banco y la misma lógica que el cliente.
//
// La web se publica en GitHub Pages y llama aquí desde otro dominio: CORS solo
// se abre a ese origen. Desde localhost el navegador bloquea la llamada, así
// que las pruebas en local no ensucian el contador real.

import { getStore } from '@netlify/blobs';
import banco from '../../data/duelos.json';
import { elegirDuelo } from '../../js/duelos.js';
import { esFechaValida, fechaMadrid, sumarDias } from '../../js/fecha.js';

const ORIGENES_PERMITIDOS = ['https://joseleking.github.io'];

function cabecerasCors(peticion) {
  const origen = peticion.headers.get('origin');
  if (!ORIGENES_PERMITIDOS.includes(origen)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (peticion, datos, estado = 200) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cabecerasCors(peticion),
    },
  });

async function contar(almacen, fecha) {
  let aciertos = 0;
  let total = 0;
  for await (const pagina of almacen.list({ prefix: `${fecha}/`, paginate: true })) {
    for (const { key } of pagina.blobs) {
      total += 1;
      if (key.startsWith(`${fecha}/1/`)) aciertos += 1;
    }
  }
  return { aciertos, total };
}

export default async (peticion) => {
  // Comprobación previa del navegador antes del POST con JSON desde otro dominio.
  if (peticion.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cabecerasCors(peticion) });
  }

  const almacen = getStore({ name: 'respuestas', consistency: 'strong' });

  if (peticion.method === 'GET') {
    const fecha = new URL(peticion.url).searchParams.get('fecha');
    if (!esFechaValida(fecha)) return json(peticion, { error: 'fecha no válida' }, 400);
    return json(peticion, await contar(almacen, fecha));
  }

  if (peticion.method === 'POST') {
    let cuerpo;
    try {
      cuerpo = await peticion.json();
    } catch {
      return json(peticion, { error: 'JSON no válido' }, 400);
    }
    const { fecha, palabra } = cuerpo ?? {};

    // Se acepta hoy y ayer: quien abrió el duelo a las 23:59 puede responder a las 00:01.
    const hoy = fechaMadrid();
    if (!esFechaValida(fecha) || (fecha !== hoy && fecha !== sumarDias(hoy, -1))) {
      return json(peticion, { error: 'fecha fuera de plazo' }, 400);
    }

    const { cartas, correcta } = elegirDuelo(banco.duelos, fecha);
    if (!cartas.some((carta) => carta.palabra === palabra)) {
      return json(peticion, { error: 'palabra no válida' }, 400);
    }

    const acierto = palabra === correcta ? 1 : 0;
    await almacen.set(`${fecha}/${acierto}/${crypto.randomUUID()}`, '1');
    return json(peticion, await contar(almacen, fecha));
  }

  return json(peticion, { error: 'método no permitido' }, 405);
};

export const config = { path: '/api/respuestas' };
