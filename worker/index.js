// Worker de Cloudflare: sirve la web de public/ y el contador global.
//
//   GET  /api/respuestas?fecha=AAAA-MM-DD     → { aciertos, total }
//   POST /api/respuestas { fecha, palabra }   → { aciertos, total } (ya incluyendo esta respuesta)
//
// Los totales viven en D1, una fila por día. Cada respuesta suma con un único
// UPSERT atómico, así que no se pierden respuestas aunque lleguen a la vez.
// El acierto se calcula aquí con el mismo banco y la misma lógica que el cliente.

import banco from '../public/data/duelos.json';
import { elegirDuelo } from '../public/js/duelos.js';
import { esFechaValida, fechaMadrid, sumarDias } from '../public/js/fecha.js';

const json = (datos, estado = 200) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

async function totales(db, fecha) {
  const fila = await db.prepare('SELECT aciertos, total FROM conteo WHERE fecha = ?1').bind(fecha).first();
  return { aciertos: fila?.aciertos ?? 0, total: fila?.total ?? 0 };
}

async function respuestas(peticion, db) {
  if (peticion.method === 'GET') {
    const fecha = new URL(peticion.url).searchParams.get('fecha');
    if (!esFechaValida(fecha)) return json({ error: 'fecha no válida' }, 400);
    return json(await totales(db, fecha));
  }

  if (peticion.method === 'POST') {
    let cuerpo;
    try {
      cuerpo = await peticion.json();
    } catch {
      return json({ error: 'JSON no válido' }, 400);
    }
    const { fecha, palabra } = cuerpo ?? {};

    // Se acepta hoy y ayer: quien abrió el duelo a las 23:59 puede responder a las 00:01.
    const hoy = fechaMadrid();
    if (!esFechaValida(fecha) || (fecha !== hoy && fecha !== sumarDias(hoy, -1))) {
      return json({ error: 'fecha fuera de plazo' }, 400);
    }

    const { cartas, correcta } = elegirDuelo(banco.duelos, fecha);
    if (!cartas.some((carta) => carta.palabra === palabra)) {
      return json({ error: 'palabra no válida' }, 400);
    }

    const fila = await db
      .prepare(
        `INSERT INTO conteo (fecha, aciertos, total) VALUES (?1, ?2, 1)
         ON CONFLICT (fecha) DO UPDATE SET aciertos = aciertos + excluded.aciertos, total = total + 1
         RETURNING aciertos, total`,
      )
      .bind(fecha, palabra === correcta ? 1 : 0)
      .first();
    return json({ aciertos: fila.aciertos, total: fila.total });
  }

  return json({ error: 'método no permitido' }, 405);
}

export default {
  async fetch(peticion, env) {
    // Los archivos de public/ los sirve Cloudflare antes de llegar aquí; al Worker
    // solo llegan las rutas que no son archivos.
    if (new URL(peticion.url).pathname === '/api/respuestas') return respuestas(peticion, env.DB);
    return env.ASSETS.fetch(peticion);
  },
};
