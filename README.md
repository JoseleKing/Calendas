# Calendas

**Ponle fecha a las palabras.** Un juego diario sobre la historia del léxico español. Cada día hay un único duelo entre dos palabras, el mismo para todos, y el jugador toca la que entró antes en el español. Tras responder se revelan los años de primera documentación, una línea de tiempo, una curiosidad y el porcentaje de jugadores que acertó.

> ⚠️ **Las fechas y curiosidades del banco de ejemplo son provisionales y pueden ser inexactas.**
> Todos los duelos de `public/data/duelos.json` llevan `"verificado": false`. Antes de publicar hay que comprobar cada año de primera documentación (y cada curiosidad) con fuentes como el **CORDE** (Corpus Diacrónico del Español), el **CDH** (Corpus del Diccionario histórico), el **Diccionario histórico de la lengua española** de la RAE o el *Diccionario crítico etimológico* de Corominas y Pascual, y cambiar el campo a `"verificado": true`. Ojo con los años redondos: casi siempre son estimaciones.

## Estructura

```
public/                        La web: todo lo que se publica
  index.html                   Única pantalla (incluye en línea el logo de la portada de arranque)
  icons/sello.svg              Favicon: el sello de lacre
  icons/*.png                  Iconos de iPhone y Android (generados)
  manifest.webmanifest         Nombre e iconos al instalar la app en el móvil
  reiniciar/index.html         /reiniciar: borra los datos locales y vuelve al juego
  css/estilos.css              Estilos (tokens de color, cartas, animaciones, modo oscuro)
  js/app.js                    Arranque y flujo de la partida
  js/fecha.js                  Fecha de Madrid, número de duelo, cuenta atrás (módulo puro)
  js/duelos.js                 Elección determinista del duelo del día y validación del banco
  js/estadisticas.js           Rachas y aciertos en localStorage
  js/api.js                    Cliente del contador global (tolerante a fallos)
  js/revelacion.js             Revelación y línea de tiempo
  js/compartir.js              Texto para compartir, Web Share API o portapapeles
  data/duelos.json             Banco de duelos
assets/                        SVG de origen de los iconos
scripts/generar-iconos.mjs     Genera los PNG de public/icons a partir de assets/ (npm run iconos)
worker/index.js                Worker de Cloudflare: el contador /api/respuestas
migrations/                    Esquema de la base de datos D1 del contador
wrangler.jsonc                 Configuración de Cloudflare (Worker y D1)
.github/workflows/pages.yml    Publica public/ en GitHub Pages en cada push a main
```

No hay framework ni paso de compilación: el navegador carga los módulos ES directamente.

## Ejecutar en local

Requisitos: Node 22 o superior.

**Con contador (recomendado):**

```sh
npm install
npm run dev                  # http://localhost:8787
```

`npm run dev` prepara una base de datos D1 local y arranca el Worker con `wrangler dev --assets public`, que sirve la web y `/api/respuestas` a la vez. La web solo se sirve así en local: a Cloudflare solo se sube el contador. Las respuestas en local van a esa base de datos local, nunca a la real.

**Solo la web:**

```sh
npm run estatico             # o: python3 -m http.server -d public
```

Sin contador, el juego funciona igual y simplemente no muestra el porcentaje global. No vale abrir `index.html` con doble clic (`file://`): los módulos ES necesitan un servidor.

### Modo desarrollo

- `?fecha=2026-10-05` simula ese día. En este modo las estadísticas se guardan aparte (no tocan las reales), no se envía nada al backend y aparece una barra arriba que lo indica.
- **`/reiniciar`** borra todo lo que Calendas guarda en el navegador (partidas, estadísticas reales y del modo desarrollo) y vuelve al juego como si nunca se hubiera jugado. Ojo: en producción, volver a jugar el duelo de hoy envía otra respuesta al contador global.
- En la consola del navegador aparecen avisos si el banco tiene errores (ids repetidos, años empatados, dificultades sin duelos…) y cuántos duelos quedan sin verificar.

## Iconos

- **iPhone («Añadir a pantalla de inicio»):** usa `icons/apple-touch-icon.png` (180×180). iOS no admite iconos SVG.
- **Android e instalación:** `manifest.webmanifest` declara los iconos de 192 y 512 px y uno *maskable*.
- **WhatsApp:** como en Periplo, no hay etiquetas `og:`, así que la vista previa del enlace muestra el título de la página y el icono de la app como miniatura pequeña.

Los PNG se generan a partir de los SVG de `assets/` con `npm run iconos` (usa `sips`, de macOS). La «C» del sello está convertida a trazado, así que no dependen de ninguna fuente.

## Cómo funciona el duelo del día

- La fecha es siempre la de **Europe/Madrid**, y el día cambia a medianoche de Madrid (con el horario de verano en cuenta).
- El **día de la semana fija la dificultad**: lunes = 1 … domingo = 7.
- Dentro de esa dificultad, los duelos se rotan **por semanas** en orden de `id`: con 2 duelos de dificultad 3, un miércoles sale el primero y el siguiente miércoles el segundo.
- El orden de las dos cartas también depende de la fecha, para que la correcta no salga siempre arriba.
- El **número de duelo** (#1, #2…) cuenta los días desde el lanzamiento, el 1 de octubre de 2026 (`FECHA_LANZAMIENTO` en `public/js/fecha.js`).

### Duelos anteriores

- El botón **Duelos anteriores** abre la lista de días pasados, del de ayer al #1, con el resultado de cada uno o la opción de jugarlo. Aparece a partir del segundo día.
- Cada duelo del archivo se abre con `?duelo=N`. Un número fuera de rango (futuro o el de hoy) lleva al duelo de hoy.
- Las partidas del archivo cuentan para jugados y aciertos, pero **no para la racha**: la racha cuenta los días en que se jugó el duelo de ese mismo día.
- Las partidas del archivo no se envían al contador global. El porcentaje que se muestra es el de quienes jugaron aquel día.
- La portada con el logo sale en cada carga de la página, incluidas las recargas. Solo se la salta al moverse dentro del juego (abrir un duelo del archivo o volver al de hoy).

## Añadir duelos

Edita `public/data/duelos.json` y añade un objeto al array `duelos`:

```json
{
  "id": 15,
  "palabraA": "sándwich",
  "anioA": 1890,
  "palabraB": "bocadillo",
  "anioB": 1600,
  "dificultad": 3,
  "curiosidad": "Dos o tres líneas sobre la historia de las palabras.",
  "verificado": false,
  "fuenteA": "CORDE: 1890, autor, obra",
  "fuenteB": "DHLE: 1600"
}
```

- `id`: entero único. Fija el orden de rotación dentro de cada dificultad.
- `anioA` / `anioB`: año de primera documentación. No pueden coincidir.
- `dificultad`: de 1 (fácil, lunes) a 7 (difícil, domingo).
- Da igual qué palabra pongas como A o como B.
- `fuenteA` / `fuenteB` (opcionales): de dónde sale cada año, para poder revisarlo. El juego no los usa.
- Conviene que todas las dificultades tengan el mismo número de duelos, para que cada día de la semana tarde lo mismo en repetirse.

**Importante:** cambiar el número de duelos de una dificultad cambia la rotación de ese día de la semana, **incluido el duelo de hoy** si es ese día. Para no cambiar el duelo a quien ya ha jugado, publica los cambios en un día de otra dificultad. Por ejemplo, añade duelos de dificultad 3 (miércoles) un jueves. El Worker usa el mismo JSON, así que web y contador siempre coinciden en cuál es la respuesta correcta.

## Porcentaje global (contador)

`worker/index.js` expone `/api/respuestas`:

- `POST { fecha, palabra }`: registra la respuesta y devuelve `{ aciertos, total }`. El acierto se calcula en el servidor y solo se aceptan respuestas de hoy o de ayer, para quien responde justo después de medianoche.
- `GET ?fecha=AAAA-MM-DD`: devuelve `{ aciertos, total }`.

Los totales se guardan en D1 (la base de datos SQLite de Cloudflare), una fila por día. Cada respuesta suma con una sola operación atómica, así que no se pierden respuestas aunque lleguen muchas a la vez. El cliente recuerda si ya envió su respuesta y la reintenta al volver a abrir si falló. Si el contador no responde en 3,5 s, el porcentaje se oculta.

Limitación del prototipo: no hay protección contra envíos falsos desde fuera de la app.

## Publicar

El juego se publica en dos sitios, los dos automáticamente en cada push a `main`:

- **La web, en GitHub Pages:** **https://joseleking.github.io/Calendas/**, como el resto de juegos. La publica `.github/workflows/pages.yml`, que sube `public/` tal cual.
- **El contador, en Cloudflare:** un Worker con la base de datos D1 en **https://calendas.calendas.workers.dev/api/respuestas**. GitHub Pages solo sirve archivos estáticos, así que no puede guardar las respuestas de todos. `js/api.js` llama al Worker cuando la web está en github.io, y el Worker solo acepta peticiones del navegador (CORS) desde `https://joseleking.github.io`. Cualquier otra ruta de calendas.calendas.workers.dev redirige a GitHub Pages, para que sigan funcionando los enlaces y las apps instaladas con la dirección antigua.

**GitHub Pages, primera vez:** el repo tiene que ser público (con cuenta gratuita, Pages no publica repos privados). En **Settings → Pages**, elige *Source: GitHub Actions*.

**Cloudflare, primera vez (desde la terminal):**

```sh
npx wrangler login                     # abre el navegador para entrar en Cloudflare
npx wrangler d1 create calendas        # solo si se monta en otra cuenta: copia el database_id en wrangler.jsonc
npm run desplegar                      # crea la tabla en D1 y publica el Worker
```

**Publicación automática del Worker en cada push:** en el panel de Cloudflare, abre **Workers & Pages → calendas → Settings → Build → Connect** y elige el repo `Calendas` de GitHub, rama `main`. Pon como *Deploy command* `npm run desplegar`, para que aplique también las migraciones nuevas de la base de datos.

**Cambios en la base de datos:** añade un archivo nuevo en `migrations/` (`0002_….sql`). `npm run desplegar` lo aplica antes de publicar.
