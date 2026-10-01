// Cliente del contador global. Cualquier fallo (sin backend, sin red, timeout,
// respuesta rara) devuelve null y la interfaz simplemente oculta el porcentaje.

// En GitHub Pages no se puede ejecutar código de servidor, así que el contador
// vive en Netlify. En cualquier otro sitio (netlify dev, o todo desplegado en
// Netlify) la función está junto a la web y basta la ruta relativa.
const CONTADOR_NETLIFY = 'https://calendas.netlify.app/api/respuestas';
const URL_API = location.hostname.endsWith('github.io') ? CONTADOR_NETLIFY : 'api/respuestas';
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

/** Registra la respuesta y devuelve los totales del día ya incluyéndola. */
export function enviarRespuesta(fecha, palabra) {
  return peticion(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha, palabra }),
  });
}

export function pedirTotales(fecha) {
  return peticion(`${URL_API}?fecha=${encodeURIComponent(fecha)}`);
}
