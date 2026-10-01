# Web de Bar Restaurante GULA (Dénia)

Web estática (HTML + CSS + JS sin dependencias). Se edita en `src/` y se genera en `dist/`.

```
src/
  data/carta.json     ← la carta: cambiar aquí platos y precios
  data/negocio.json   ← teléfono, dirección, horario, enlaces
  pages/              ← páginas (index, carta, legal, 404)
  partials/           ← cabecera, pie, barra móvil
  assets/             ← css, js, fuentes, imágenes
scripts/
  build.mjs           ← genera dist/
  serve.mjs           ← servidor local
  shapes.mjs          ← genera los SVG de brochazos y papel rasgado
docs/                 ← brief, dirección creativa y QA (solo en local, no se publica)
```

## Uso

```bash
npm run dev
```

Genera `dist/` y la sirve en http://localhost:4321.

```bash
npm run check
```

Build + validación HTML.

```bash
npm run deploy
```

Publica `dist/` en la rama `gh-pages` (GitHub Pages).

El horario de `negocio.json` alimenta a la vez la tabla de horario, el estado "abierto/cerrado", el reloj de la portada y el JSON-LD: basta con cambiarlo en un sitio.
