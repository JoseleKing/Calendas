# Calendas

**¿Quién lo dijo primero?** Un juego diario sobre la historia del léxico español. Cada día hay un único duelo entre dos palabras, el mismo para todos, y el jugador toca la que entró antes en el español. Tras responder se revelan los años de primera documentación, una línea de tiempo, una curiosidad y el porcentaje de jugadores que acertó.

> ⚠️ **Las fechas y curiosidades del banco de ejemplo son provisionales y pueden ser inexactas.**
> Todos los duelos de `data/duelos.json` llevan `"verificado": false`. Antes de publicar hay que comprobar cada año de primera documentación (y cada curiosidad) con fuentes como el **CORDE** (Corpus Diacrónico del Español), el **CDH** (Corpus del Diccionario histórico), el **Diccionario histórico de la lengua española** de la RAE o el *Diccionario crítico etimológico* de Corominas y Pascual, y cambiar el campo a `"verificado": true`. Ojo con los años redondos: casi siempre son estimaciones.

## Estructura

```
index.html                     Única pantalla (incluye en línea el logo de la portada de arranque)
icons/sello.svg                Favicon: el sello de lacre
reiniciar/index.html           /reiniciar: borra los datos locales y vuelve al juego
css/estilos.css                Estilos (tokens de color, cartas, animaciones, modo oscuro)
js/app.js                      Arranque y flujo de la partida
js/fecha.js                    Fecha de Madrid, número de duelo, cuenta atrás (módulo puro)
js/duelos.js                   Elección determinista del duelo del día y validación del banco
js/estadisticas.js             Rachas y aciertos en localStorage
js/api.js                      Cliente del contador global (tolerante a fallos)
js/revelacion.js               Revelación y línea de tiempo
js/compartir.js                Texto para compartir, Web Share API o portapapeles
data/duelos.json               Banco de duelos
netlify/functions/respuestas.mjs  Contador global de respuestas (Netlify Functions + Blobs)
```

No hay framework ni paso de compilación: el navegador carga los módulos ES directamente.

## Ejecutar en local

Requisitos: Node 22.12 o superior.

**Con backend (recomendado):**

```sh
npm install
npm install -g netlify-cli   # una sola vez
npm run dev                  # http://localhost:8888
```

`netlify dev` sirve la web y la función `/api/respuestas` a la vez, con un almacén de Blobs local.

**Solo el frontend:**

```sh
npm run estatico             # o: python3 -m http.server
```

Sin backend, el juego funciona igual y simplemente no muestra el porcentaje global. No vale abrir `index.html` con doble clic (`file://`): los módulos ES necesitan un servidor.

### Modo desarrollo

- `?fecha=2026-10-05` simula ese día. En este modo las estadísticas se guardan aparte (no tocan las reales), no se envía nada al backend y aparece una barra arriba que lo indica.
- **`/reiniciar`** borra todo lo que Calendas guarda en el navegador (partidas, estadísticas reales y del modo desarrollo) y vuelve al juego como si nunca se hubiera jugado. Ojo: en producción, volver a jugar el duelo de hoy envía otra respuesta al contador global.
- En la consola del navegador aparecen avisos si el banco tiene errores (ids repetidos, años empatados, dificultades sin duelos…) y cuántos duelos quedan sin verificar.

## Cómo funciona el duelo del día

- La fecha es siempre la de **Europe/Madrid**, y el día cambia a medianoche de Madrid (con el horario de verano en cuenta).
- El **día de la semana fija la dificultad**: lunes = 1 … domingo = 7.
- Dentro de esa dificultad, los duelos se rotan **por semanas** en orden de `id`: con 2 duelos de dificultad 3, un miércoles sale el primero y el siguiente miércoles el segundo.
- El orden de las dos cartas también depende de la fecha, para que la correcta no salga siempre arriba.
- El **número de duelo** (#1, #2…) cuenta los días desde el lanzamiento, el 1 de octubre de 2026 (`FECHA_LANZAMIENTO` en `js/fecha.js`).

### Duelos anteriores

- El botón **Duelos anteriores** abre la lista de días pasados, del de ayer al #1, con el resultado de cada uno o la opción de jugarlo. Aparece a partir del segundo día.
- Cada duelo del archivo se abre con `?duelo=N`. Un número fuera de rango (futuro o el de hoy) lleva al duelo de hoy.
- Las partidas del archivo cuentan para jugados y aciertos, pero **no para la racha**: la racha cuenta los días en que se jugó el duelo de ese mismo día.
- Las partidas del archivo no se envían al contador global. El porcentaje que se muestra es el de quienes jugaron aquel día.
- La portada con el logo solo sale la primera vez de cada sesión, para que no se repita al moverse por el archivo.

## Añadir duelos

Edita `data/duelos.json` y añade un objeto al array `duelos`:

```json
{
  "id": 15,
  "palabraA": "sándwich",
  "anioA": 1890,
  "palabraB": "bocadillo",
  "anioB": 1600,
  "dificultad": 3,
  "curiosidad": "Dos o tres líneas sobre la historia de las palabras.",
  "verificado": false
}
```

- `id`: entero único. Fija el orden de rotación dentro de cada dificultad.
- `anioA` / `anioB`: año de primera documentación. No pueden coincidir.
- `dificultad`: de 1 (fácil, lunes) a 7 (difícil, domingo).
- Da igual qué palabra pongas como A o como B.
- Conviene que todas las dificultades tengan el mismo número de duelos, para que cada día de la semana tarde lo mismo en repetirse.

**Importante:** cambiar el número de duelos de una dificultad cambia la rotación de ese día de la semana, **incluido el duelo de hoy** si es ese día. Para no cambiar el duelo a quien ya ha jugado, publica los cambios en un día de otra dificultad. Por ejemplo, añade duelos de dificultad 3 (miércoles) un jueves. La función del backend usa el mismo JSON, así que web y backend siempre coinciden en cuál es la respuesta correcta.

## Porcentaje global (backend)

`netlify/functions/respuestas.mjs` expone `/api/respuestas`:

- `POST { fecha, palabra }`: registra la respuesta y devuelve `{ aciertos, total }`. El acierto se calcula en el servidor y solo se aceptan respuestas de hoy o de ayer, para quien responde justo después de medianoche.
- `GET ?fecha=AAAA-MM-DD`: devuelve `{ aciertos, total }`.

Cada respuesta se guarda como una clave propia en Netlify Blobs y los totales se obtienen listando las claves del día. Así no se pierden respuestas cuando llegan varias a la vez. El cliente recuerda si ya envió su respuesta y la reintenta al volver a abrir si falló. Si el backend no responde en 3,5 s, el porcentaje se oculta.

Limitaciones del prototipo: no hay protección contra envíos falsos desde fuera de la app, y contar listando claves es lento con decenas de miles de respuestas al día. Para más tráfico, cambia el almacén por un contador atómico (por ejemplo, `INCR` en Redis o Upstash).

## Publicar en GitHub Pages

`.github/workflows/pages.yml` publica el juego en cada push a `main`. La primera vez hay que activarlo en el repositorio de GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Después se puede lanzar a mano desde la pestaña **Actions** (*Publicar en GitHub Pages → Run workflow*) o hacer un push a `main`.

El juego queda en `https://<usuario>.github.io/Calendas/`. GitHub Pages solo sirve archivos estáticos: la función del contador no se publica y el juego oculta el porcentaje global. Para tenerlo, despliega en Netlify (abajo).

## Desplegar en Netlify

1. Sube el repositorio a GitHub.
2. En Netlify: **Add new site → Import an existing project** y elige el repo. `netlify.toml` ya define la configuración: publica la raíz, usa las funciones de `netlify/functions` y Node 22. No hay comando de build.
3. Despliega. Netlify Blobs no requiere configuración adicional.

También desde la terminal: `netlify init` la primera vez y luego `netlify deploy --prod`.
