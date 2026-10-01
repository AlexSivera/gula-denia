// Genera los recursos SVG de marca (papel rasgado, brochazos, goteo).
// Determinista: misma semilla → mismas formas. Uso: node scripts/shapes.mjs
import { writeFileSync } from 'node:fs';

const out = new URL('../src/assets/img/', import.meta.url);

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
const f = (n) => Math.round(n * 10) / 10;

// Papel rasgado: rectángulo con los cuatro bordes irregulares.
function torn(seed) {
  const r = rng(seed);
  const pts = [];
  const step = () => 8 + r() * 14;
  const off = () => r() * 16;
  for (let x = 0; x < 1000; x += step()) pts.push([x, off()]);
  for (let y = 0; y < 1000; y += step()) pts.push([1000 - off(), y]);
  for (let x = 1000; x > 0; x -= step()) pts.push([x, 1000 - off()]);
  for (let y = 1000; y > 0; y -= step()) pts.push([off(), y]);
  const d = 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="${d}"/></svg>`;
}

// Brochazo: banda con extremos de cerdas y huecos de pincel seco.
function brush(seed, color) {
  const r = rng(seed);
  const top = [], bottom = [];
  for (let x = 30; x <= 970; x += 20 + r() * 25) {
    top.push([x, 28 + Math.sin(x / 140) * 6 + r() * 10]);
    bottom.push([x, 172 + Math.sin(x / 170 + 1) * 7 - r() * 10]);
  }
  const right = [];
  for (let y = top.at(-1)[1]; y < bottom.at(-1)[1]; y += 6 + r() * 7) {
    right.push([975 + r() * 22 - (r() > 0.6 ? 30 : 0), y]);
  }
  const left = [];
  for (let y = bottom[0][1]; y > top[0][1]; y -= 6 + r() * 7) {
    left.push([2 + r() * 26 + (r() > 0.6 ? 22 : 0), y]);
  }
  const body = [...top, ...right, ...bottom.reverse(), ...left];
  let d = 'M' + body.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
  // Huecos de pincel seco (evenodd los vacía).
  for (let i = 0; i < 7; i++) {
    const y = 50 + r() * 100;
    const x = 120 + r() * 700;
    const w = 60 + r() * 180;
    const h = 1.5 + r() * 3;
    d += `M${f(x)} ${f(y)}q${f(w / 2)} ${f(-h)} ${f(w)} 0q${f(-w / 2)} ${f(h * 1.6)} ${f(-w)} 0Z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 200" preserveAspectRatio="none"><path fill="${color}" fill-rule="evenodd" d="${d}"/></svg>`;
}

// Goteo: gotas que caen de una línea, eco del logo.
function drips(seed, color) {
  const r = rng(seed);
  let d = '';
  // Se estira con la palabra "GULA": x en milésimas de su ancho (bajo la U, la L y la pata derecha de la A).
  for (const [x, w, h] of [[400, 13, 78], [585, 10, 52], [930, 12, 100]]) {
    const hh = h + r() * 10;
    d += `M${f(x - w)} 0C${f(x - w)} ${f(hh * 0.6)} ${f(x - w * 0.6)} ${f(hh)} ${f(x)} ${f(hh)}C${f(x + w * 0.6)} ${f(hh)} ${f(x + w)} ${f(hh * 0.6)} ${f(x + w)} 0Z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 115" preserveAspectRatio="none"><path fill="${color}" d="${d}"/></svg>`;
}

writeFileSync(new URL('torn-mask.svg', out), torn(7));
writeFileSync(new URL('torn-mask-2.svg', out), torn(91));
writeFileSync(new URL('brush-wash.svg', out), brush(3, '#A9D8D9'));
writeFileSync(new URL('brush-wash-2.svg', out), brush(29, '#A9D8D9'));
writeFileSync(new URL('brush-teal.svg', out), brush(11, '#2C9AA3'));
writeFileSync(new URL('drips.svg', out), drips(5, '#2C9AA3'));
console.log('SVG de marca generados');
