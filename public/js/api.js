// Cliente del contador global. Cualquier fallo (sin backend, sin red, timeout,
// respuesta rara) devuelve null y la interfaz simplemente oculta el porcentaje.

// En GitHub Pages el contador vive en el Worker de Cloudflare, en otro dominio.
// En local (npm run dev) el Worker sirve la web y el contador desde el mismo sitio.
const URL_API = location.hostname.endsWith('github.io')
  ? 'https://calendas.calendas.workers.dev/api/respuestas'
  : 'api/respuestas';
const TIEMPO_MAXIMO_MS = 3500;

async function peticion(url, opciones = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);
  try {
    const respuesta = await fetch(url, { ...opciones, signal: controlador.signal });
    if (!respuesta.ok) return null;
    const { aciertos, total } = await respuesta.json();
    return Number.isInteger(aciertos) && Number.isInteger(total) ? { aciertos, total } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

/** Registra la respuesta a un duelo del día (ronda 1, 2 o 3) y devuelve sus totales ya incluyéndola. */
export function enviarRespuesta(fecha, ronda, palabra) {
  return peticion(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha, ronda, palabra }),
  });
}

export function pedirTotales(fecha, ronda) {
  return peticion(`${URL_API}?${new URLSearchParams({ fecha, ronda })}`);
}
