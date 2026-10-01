// Build estático de la web de Gula: src/ → dist/
// - Inserta parciales ({{> nombre}}) y marca la página activa.
// - Genera la carta, la pizarra de bocadillos y el JSON-LD desde src/data/carta.json.
// Sin dependencias. Uso: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

// URL pública del sitio (canonical, Open Graph, sitemap). Se puede cambiar con SITE_URL.
const SITE = (process.env.SITE_URL || 'https://gulaendenia.es/').replace(/\/?$/, '/');
const carta = JSON.parse(readFileSync(join(src, 'data/carta.json'), 'utf8'));
const negocio = JSON.parse(readFileSync(join(src, 'data/negocio.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const euro = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ---------- Carta ----------
function plato(p) {
  const precio = p.precio != null
    ? `<data class="plato__precio" value="${p.precio.toFixed(2)}">${euro(p.precio)}</data>`
    : '';
  const casa = p.casa ? ' <span class="plato__casa" title="Plato de la casa">de la casa</span>' : '';
  const desc = p.desc ? `<p class="plato__desc">${esc(p.desc)}</p>` : '';
  return `<li class="plato"><div class="plato__linea"><h3 class="plato__nombre">${esc(p.nombre)}${casa}</h3><span class="plato__puntos" aria-hidden="true"></span>${precio}</div>${desc}</li>`;
}

function seccion(s) {
  const grupos = s.grupos.map((g, i) => {
    const titulo = g.titulo ? `<h3 class="carta-grupo__titulo">${esc(g.titulo)}</h3>` : '';
    const sep = i > 0 && !g.titulo ? '<div class="sep" aria-hidden="true"><span>×</span></div>' : '';
    return `${sep}<div class="carta-grupo">${titulo}<ul class="platos${s.sinPrecios ? ' platos--sin-precio' : ''}">${g.platos.map(plato).join('')}</ul></div>`;
  }).join('');
  const sello = s.sello ? `<p class="sello sello--carta"><span>${esc(s.sello)}</span></p>` : '';
  const nota = s.nota ? `<p class="carta-seccion__nota">${esc(s.nota)}</p>` : '';
  return `<section class="carta-seccion" id="${s.id}" aria-labelledby="t-${s.id}">
  <header class="carta-seccion__cabecera"><h2 class="titulo-brocha" id="t-${s.id}"><span>${esc(s.titulo)}</span></h2>${sello}</header>
  ${nota}${grupos}
</section>`;
}

const cartaHTML = carta.secciones.map(seccion).join('\n');
const cartaNav = carta.secciones.map((s) => `<li><a href="#${s.id}">${esc(s.titulo)}</a></li>`).join('');

// ---------- Pizarra del almuerzo (inicio) ----------
const bocadillos = carta.secciones.find((s) => s.id === 'bocadillos').grupos.flatMap((g) => g.platos);
const pizarra = bocadillos.map((b, i) =>
  `<li><button type="button" class="pizarra__nombre" aria-pressed="false" data-nombre="${esc(b.nombre)}" data-desc="${esc(b.desc || '')}" data-precio="${euro(b.precio)}">${esc(b.nombre)}</button>${i < bocadillos.length - 1 ? '<span class="pizarra__x" aria-hidden="true">×</span>' : ''}</li>`
).join('');

// Precio de un plato por sección + nombre, para citar en el copy sin duplicar datos.
function precio(seccionId, nombre) {
  const s = carta.secciones.find((x) => x.id === seccionId);
  const p = s.grupos.flatMap((g) => g.platos).find((x) => x.nombre === nombre);
  if (!p || p.precio == null) throw new Error(`Precio no encontrado: ${seccionId}/${nombre}`);
  return euro(p.precio);
}

// ---------- JSON-LD ----------
const dias = { lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday', jueves: 'Thursday', viernes: 'Friday', sabado: 'Saturday', domingo: 'Sunday' };
const restaurante = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  '@id': SITE + '#restaurante',
  name: negocio.nombre,
  alternateName: 'Gula',
  url: SITE,
  telephone: negocio.telefono.e164,
  image: SITE + 'assets/img/og-gula.jpg',
  address: {
    '@type': 'PostalAddress',
    streetAddress: negocio.direccion.calle,
    addressLocality: negocio.direccion.localidad,
    postalCode: negocio.direccion.cp,
    addressRegion: negocio.direccion.provincia,
    addressCountry: 'ES'
  },
  geo: { '@type': 'GeoCoordinates', latitude: negocio.geo.lat, longitude: negocio.geo.lng },
  hasMap: negocio.enlaces.maps,
  openingHoursSpecification: Object.entries(negocio.horario)
    .filter(([, h]) => h)
    .map(([d, h]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: dias[d], opens: h[0], closes: h[1] })),
  servesCuisine: ['Pizzas', 'Hamburguesas', 'Bocadillos', 'Tapas', 'Desayunos'],
  priceRange: '€',
  hasMenu: SITE + 'carta.html',
  sameAs: [negocio.enlaces.instagram, negocio.enlaces.facebook]
};
const menuLD = {
  '@context': 'https://schema.org',
  '@type': 'Menu',
  name: 'Carta de Gula',
  url: SITE + 'carta.html',
  inLanguage: 'es',
  hasMenuSection: carta.secciones.filter((s) => !s.sinPrecios).map((s) => ({
    '@type': 'MenuSection',
    name: s.titulo,
    hasMenuItem: s.grupos.flatMap((g) => g.platos).filter((p) => p.precio != null && !/^Extra/.test(p.nombre)).map((p) => ({
      '@type': 'MenuItem',
      name: p.nombre,
      ...(p.desc ? { description: p.desc } : {}),
      offers: { '@type': 'Offer', price: p.precio.toFixed(2), priceCurrency: 'EUR' }
    }))
  }))
};
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

// ---------- Horario (tabla) ----------
const nombresDia = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
const horarioHTML = Object.entries(negocio.horario).map(([d, h], i) =>
  `<div class="horario__fila" data-dia="${(i + 1) % 7}"><dt>${nombresDia[d]}</dt><dd>${h ? `${h[0].replace(/^0/, '')}–${h[1]}` : 'Cerrado'}</dd></div>`
).join('');

// ---------- Plantillas ----------
const partials = Object.fromEntries(
  readdirSync(join(src, 'partials')).map((f) => [f.replace('.html', ''), readFileSync(join(src, 'partials', f), 'utf8')])
);

const vars = {
  carta: cartaHTML,
  'carta-nav': cartaNav,
  pizarra,
  horario: horarioHTML,
  'horario-json': JSON.stringify(Object.fromEntries(Object.values(negocio.horario).map((h, i) => [String((i + 1) % 7), h]))),
  'ld-restaurante': ld(restaurante),
  'ld-menu': ld(menuLD),
  site: SITE,
  tel: negocio.telefono.visible,
  'tel-href': 'tel:' + negocio.telefono.e164,
  maps: negocio.enlaces.maps,
  'maps-dir': negocio.enlaces.comoLlegar,
  'maps-embed': negocio.enlaces.embed,
  instagram: negocio.enlaces.instagram,
  facebook: negocio.enlaces.facebook,
  glovo: negocio.enlaces.glovo,
  justeat: negocio.enlaces.justEat,
  resenas: negocio.enlaces.resenas,
  year: String(new Date().getFullYear())
};

function render(html, page) {
  // Parciales (un nivel de anidación basta).
  for (let i = 0; i < 2; i++) html = html.replace(/\{\{> ([\w-]+)\}\}/g, (_, n) => partials[n] ?? `<!-- parcial ${n} no encontrado -->`);
  html = html.replace(/\{\{precio:([\w-]+)\/([^}]+)\}\}/g, (_, s, n) => precio(s, n));
  html = html.replace(/\{\{actual:([\w-]+)\}\}/g, (_, p) => (p === page ? ' aria-current="page"' : ''));
  html = html.replace(/\{\{([\w-]+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Variable sin definir en ${page}: ${m}`);
    return vars[k];
  });
  return html;
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(src, 'assets'), join(dist, 'assets'), { recursive: true });
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE}carta.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
</urlset>
`);
writeFileSync(join(dist, '.nojekyll'), ''); // GitHub Pages: servir tal cual, sin Jekyll

for (const f of readdirSync(join(src, 'pages'))) {
  const page = f.replace('.html', '');
  writeFileSync(join(dist, f), render(readFileSync(join(src, 'pages', f), 'utf8'), page));
  console.log('✓', f);
}
console.log(`Build OK → dist/ (${carta.secciones.length} secciones de carta, ${bocadillos.length} bocadillos en la pizarra)`);
