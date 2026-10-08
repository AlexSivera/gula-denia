// Gula · Dénia — interacción mínima, sin dependencias.
// La web funciona sin JS; esto añade el "reloj de Gula" y pequeñas ayudas.
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Hora de Dénia ----------
  const HORARIO = JSON.parse($('#datos-horario')?.textContent || '{}'); // { "0": ["08:00","23:30"], "3": null, ... } (0 = domingo)
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fmt = (hhmm) => hhmm.replace(/^0/, '');
  const DIA_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function ahoraDenia() {
    const partes = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).map((p) => [p.type, p.value])
    );
    const h = Number(partes.hour), m = Number(partes.minute);
    return { dia: DIA_EN[partes.weekday], min: h * 60 + m, hhmm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  }

  // Próxima apertura a partir de (dia, min).
  function proximaApertura(dia, min) {
    for (let i = 0; i < 8; i++) {
      const d = (dia + i) % 7;
      const h = HORARIO[d];
      if (!h) continue;
      if (i === 0 && min >= aMin(h[0])) continue;
      const cuando = i === 0 ? 'hoy' : i === 1 ? 'mañana' : `el ${DIAS[d]}`;
      return { cuando, hora: fmt(h[0]), dia: d };
    }
    return null;
  }

  function estadoActual() {
    const t = ahoraDenia();
    const h = HORARIO[t.dia];
    const abierto = !!h && t.min >= aMin(h[0]) && t.min < aMin(h[1]);
    return { ...t, abierto, cierre: h ? fmt(h[1]) : null, minsParaCerrar: abierto ? aMin(h[1]) - t.min : null, proxima: abierto ? null : proximaApertura(t.dia, t.min) };
  }

  // ---------- Franjas del día ----------
  const FOTO = (n, alt) => ({ src: `assets/img/${n}-800.webp`, srcset: `assets/img/${n}-480.webp 480w, assets/img/${n}-800.webp 800w, assets/img/${n}-1200.webp 1200w`, alt });
  const FRANJAS = {
    manana: {
      titulo: 'Café y tostada',
      texto: () => 'Tostadas, croissants, huevos revueltos y bol de yogur, hasta las 12:00.',
      enlace: ['Ver desayunos →', 'carta.html#desayunos'],
      foto: FOTO('desayuno', 'Tostada con tomate y un café para llevar')
    },
    almuerzo: {
      titulo: 'Toca almuerzo',
      texto: () => 'Bocadillo, bebida y café hasta las 12:00. Quince bocadillos con nombre en la pizarra.',
      enlace: ['Ver la pizarra →', '#almuerzo'],
      foto: FOTO('almuerzo', 'Bocadillo de barra relleno, sobre la mesa')
    },
    mediodia: {
      titulo: 'Menú del día',
      texto: () => 'Cambia cada día. Llámanos al 865 83 35 27 y te decimos qué hay hoy.',
      enlace: ['Llamar →', 'tel:+34865833527'],
      foto: FOTO('mediodia', 'Ración de calamares fritos en la barra, con una caña detrás')
    },
    noche: {
      titulo: 'Pizzas y burgers',
      texto: (e) => `Con bebida de 33 cl incluida. En la terraza, para llevar o a domicilio, hasta las ${e.cierre}.`,
      enlace: ['Ver pizzas y burgers →', 'carta.html#pizzas'],
      foto: FOTO('noche-pizza', 'Pizza cortada en porciones con un refresco al lado')
    }
  };
  const franjaDe = (min) => (min < 540 ? 'manana' : min < 720 ? 'almuerzo' : min < 960 ? 'mediodia' : 'noche');

  function pintarEstado() {
    const e = estadoActual();

    // Cabecera
    const est = $('[data-estado]');
    if (est) {
      let texto;
      if (e.abierto) texto = e.minsParaCerrar <= 30 ? `Cerramos a las ${e.cierre}` : `Abierto · hasta las ${e.cierre}`;
      else texto = e.proxima ? `Cerrado · abrimos ${e.proxima.cuando} a las ${e.proxima.hora}` : 'Cerrado';
      $('[data-estado-texto]', est).textContent = texto;
      est.classList.toggle('estado--abierto', e.abierto);
      est.hidden = false;
    }

    // Horario: marcar hoy
    $$('[data-horario] .horario__fila').forEach((f) => {
      const hoy = Number(f.dataset.dia) === e.dia;
      f.classList.toggle('hoy', hoy);
      const dt = $('dt', f);
      let tag = $('.horario__hoy', dt);
      if (hoy && !tag) { tag = document.createElement('span'); tag.className = 'horario__hoy'; tag.textContent = 'hoy'; dt.append(tag); }
      if (!hoy && tag) tag.remove();
    });

    // Resto: solo en la portada
    const reloj = $('[data-reloj]');
    if (!reloj) return;
    reloj.textContent = e.hhmm;
    reloj.dateTime = e.hhmm;

    const titulo = $('[data-franja-titulo]'), texto = $('[data-franja-texto]'), enlace = $('[data-franja-enlace]');
    const regla = $('[data-regla]'), marca = $('[data-regla-marca]');
    let clave = null;

    if (e.abierto) {
      clave = franjaDe(e.min);
      const f = FRANJAS[clave];
      titulo.textContent = f.titulo;
      texto.textContent = f.texto(e);
      enlace.textContent = f.enlace[0];
      enlace.href = f.enlace[1];
    } else {
      const miercoles = e.dia === 3;
      titulo.textContent = miercoles ? 'Los miércoles descansamos' : 'Ahora mismo, cerrado';
      texto.textContent = e.proxima
        ? `Abrimos ${e.proxima.cuando} a las ${e.proxima.hora}${e.proxima.hora === '6:00' ? ', con el café puesto' : ''}. Mientras, mira la carta.`
        : 'Mientras, mira la carta.';
      enlace.textContent = 'Ver la carta →';
      enlace.href = 'carta.html';
    }

    // Regla del día
    if (regla && marca) {
      const inicio = 360, fin = 1410; // 6:00 → 23:30
      const dentro = e.abierto && e.min >= inicio && e.min <= fin;
      marca.hidden = !dentro;
      if (dentro) marca.style.setProperty('--pos', ((e.min - inicio) / (fin - inicio)) * 100 + '%');
      const pista = $('.regla__pista', regla);
      regla.classList.toggle('regla--cerrada', !HORARIO[e.dia]);
      pista.dataset.cerrado = 'Miércoles: descansamos';
    }

    // Franja actual en la línea del tiempo
    $$('.franja').forEach((li) => {
      const es = li.dataset.franja === clave;
      li.toggleAttribute('data-actual', es);
      const hora = $('.franja__hora', li);
      let tag = $('.franja__ahora', hora);
      if (es && !tag) { tag = document.createElement('span'); tag.className = 'franja__ahora'; tag.textContent = 'Ahora'; hora.append(tag); }
      if (!es && tag) tag.remove();
    });

    // Foto del hero según la hora (la noche ya viene en el HTML)
    const fig = $('[data-foto]');
    const nueva = clave ? FRANJAS[clave].foto : FRANJAS.noche.foto;
    const img = fig && $('img', fig);
    if (img && !img.src.endsWith(nueva.src)) {
      const cambiar = () => { img.srcset = nueva.srcset; img.src = nueva.src; img.alt = nueva.alt; };
      if (reduceMotion) cambiar();
      else {
        fig.classList.add('cambiando');
        const pre = new Image();
        pre.onload = pre.onerror = () => { cambiar(); requestAnimationFrame(() => fig.classList.remove('cambiando')); };
        pre.src = nueva.src;
      }
    }
  }

  if (Object.keys(HORARIO).length) {
    pintarEstado();
    setInterval(pintarEstado, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pintarEstado(); });
  }

  // ---------- Pizarra del almuerzo ----------
  const detalle = $('[data-pizarra-detalle]');
  if (detalle) {
    const botones = $$('.pizarra__nombre');
    botones.forEach((b) => b.addEventListener('click', () => {
      const activo = b.getAttribute('aria-pressed') === 'true';
      botones.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      if (activo) return;
      b.setAttribute('aria-pressed', 'true');
      detalle.replaceChildren();
      const add = (tag, cls, txt) => { const el = document.createElement(tag); el.className = cls; el.textContent = txt; detalle.append(el); };
      add('p', 'pizarra__detalle-nombre', b.dataset.nombre);
      add('p', 'pizarra__detalle-precio', b.dataset.precio);
      if (b.dataset.desc) add('p', 'pizarra__detalle-desc', b.dataset.desc);
    }));
  }

  // ---------- Mapa bajo demanda ----------
  $$('[data-mapa-cargar]').forEach((btn) => btn.addEventListener('click', () => {
    const cont = btn.closest('[data-mapa]');
    const iframe = document.createElement('iframe');
    iframe.src = cont.dataset.src;
    iframe.title = 'Mapa: Bar Restaurante Gula, Av. de Ramón Ortega 7, Dénia';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    cont.replaceChildren(iframe);
    iframe.focus();
  }));

  // ---------- Brochazos que se pintan al entrar en pantalla ----------
  const titulos = $$('.titulo-brocha');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entradas) => entradas.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('pintado'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    titulos.forEach((t) => io.observe(t));
  } else titulos.forEach((t) => t.classList.add('pintado'));

  // ---------- Fotos de las franjas: se destapan al entrar ----------
  const fotos = $$('.franja__foto');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entradas) => entradas.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -18% 0px' });
    fotos.forEach((f) => io.observe(f));
  } else fotos.forEach((f) => f.classList.add('visto'));

  // ---------- El scroll es el día: de las 6:00 a las 23:30 ----------
  // Una línea se rellena por la línea del tiempo y un reloj la acompaña,
  // interpolando la hora entre las franjas. Solo transform: no fuerza layout al hacer scroll.
  const lista = $('.dia__lista');
  if (lista && !reduceMotion) {
    const franjas = $$('.franja', lista);
    // Hora al llegar a cada franja. El atardecer (16:00 → 20:00) corre en el hueco
    // entre el menú del día y la noche, donde el fondo pasa a petróleo.
    const HORAS = { manana: 360, almuerzo: 540, mediodia: 720, noche: 1200 };
    const FIN_MEDIODIA = 960; // 16:00
    const CIERRE = 1410; // 23:30
    const nueva = (cls) => { const el = document.createElement('span'); el.className = cls; el.setAttribute('aria-hidden', 'true'); return el; };
    const linea = nueva('dia__linea'), relojDia = nueva('dia__reloj');
    lista.append(linea, relojDia);
    lista.classList.add('dia__lista--viva');

    let paradas = [], nudos = [], ini = 0, fin = 0, origen = 0, texto = '', pendiente = false;

    const pintar = () => {
      pendiente = false;
      if (!paradas.length) return;
      const punta = Math.min(Math.max(scrollY + innerHeight * 0.6 - origen, ini), fin);
      linea.style.transform = `scaleY(${(punta - ini) / (fin - ini || 1)})`;
      relojDia.style.transform = `translateY(${punta}px) translate(-50%, -50%) rotate(-90deg)`;

      let t = CIERRE;
      for (let i = 0; i < paradas.length - 1; i++) {
        const a = paradas[i], b = paradas[i + 1];
        if (punta <= b.y) { t = a.t + (b.t - a.t) * ((punta - a.y) / (b.y - a.y || 1)); break; }
      }
      const m = Math.round(t / 5) * 5;
      const nuevo = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      if (nuevo !== texto) relojDia.textContent = texto = nuevo;

      franjas.forEach((li, i) => li.classList.toggle('franja--pasada', punta >= nudos[i] - 1));
      relojDia.classList.toggle('dia__reloj--noche', punta >= nudos.at(-1));
    };
    const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } };

    const medir = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const nudo = 1.025 * rem; // centro del nudo de cada franja (top .55rem + mitad de .95rem)
      origen = lista.getBoundingClientRect().top + scrollY;
      nudos = franjas.map((li) => li.offsetTop + nudo);
      paradas = franjas.flatMap((li, i) => {
        const p = [{ y: nudos[i], t: HORAS[li.dataset.franja] ?? CIERRE }];
        if (li.dataset.franja === 'mediodia') {
          const finContenido = li.offsetTop + li.offsetHeight - parseFloat(getComputedStyle(li).paddingBottom);
          p.push({ y: finContenido, t: FIN_MEDIODIA });
        }
        return p;
      });
      const ultima = franjas.at(-1);
      paradas.push({ y: ultima.offsetTop + ultima.offsetHeight - 1.5 * rem, t: CIERRE });
      ini = paradas[0].y; fin = paradas.at(-1).y;
      linea.style.top = ini + 'px';
      linea.style.height = fin - ini + 'px';
      pintar();
    };

    addEventListener('scroll', pedir, { passive: true });
    // Lo de arriba (fuentes, foto del hero) puede mover la lista: se vuelve a medir.
    if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(medir)).observe(document.body);
    else addEventListener('resize', medir);
    addEventListener('load', medir);
    medir();
  }

  // ---------- Carta: sección activa en la barra de categorías ----------
  const nav = $('.carta-nav');
  if (nav && 'IntersectionObserver' in window) {
    const lista = $('ul', nav);
    const enlaces = new Map($$('a', nav).map((a) => [a.hash.slice(1), a]));
    const visibles = new Set();
    const marcar = () => {
      const id = [...enlaces.keys()].find((k) => visibles.has(k));
      enlaces.forEach((a, k) => (k === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      const a = enlaces.get(id);
      if (a) lista.scrollTo({ left: a.offsetLeft - lista.clientWidth / 2 + a.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => (en.isIntersecting ? visibles.add(en.target.id) : visibles.delete(en.target.id)));
      marcar();
    }, { rootMargin: '-30% 0px -60% 0px' });
    enlaces.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ---------- Imprimir la carta ----------
  const imprimir = $('[data-imprimir]');
  if (imprimir) { imprimir.hidden = false; imprimir.addEventListener('click', () => window.print()); }
})();
