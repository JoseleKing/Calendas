// Genera los PNG de iconos y la imagen para compartir a partir de los SVG de assets/
// (los textos ya están convertidos a trazados, así que no dependen de ninguna fuente).
// Usa sips, incluido en macOS. Uso: npm run iconos
import { execFileSync } from 'node:child_process';

const IMAGENES = [
  ['assets/logo-cuadrado.svg', 'apple-touch-icon.png', 180, 180], // iPhone: «Añadir a pantalla de inicio»
  ['assets/logo-cuadrado.svg', 'icon-192.png', 192, 192],
  ['assets/logo-cuadrado.svg', 'icon-512.png', 512, 512],
  ['assets/logo-maskable.svg', 'icon-maskable-512.png', 512, 512],
  ['assets/compartir.svg', 'compartir.png', 630, 1200], // WhatsApp y redes: alto × ancho
];

for (const [fuente, destino, alto, ancho] of IMAGENES) {
  execFileSync('sips', ['-s', 'format', 'png', '-z', String(alto), String(ancho), fuente, '--out', `public/icons/${destino}`], {
    stdio: 'ignore',
  });
}
console.log('Iconos generados en public/icons');
