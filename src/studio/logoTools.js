// Procesamiento local del logotipo (sin servicios externos).
// La eliminación de fondo usa relleno por inundación desde los bordes con tolerancia
// de color, borde suavizado y "descontaminación" del color del fondo en los píxeles
// de transición. Funciona muy bien con logos sobre fondos lisos (el caso habitual).

export const MAX_FILE_MB = 5;
export const MAX_SIDE = 1600;
const MIN_SIDE = 24;

const TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

export function validateFile(file) {
  if (!file) return 'No se seleccionó ningún archivo.';
  const ext = extOf(file.name);
  const kind = TYPES[file.type] || ({ png: 'png', jpg: 'jpg', jpeg: 'jpg', svg: 'svg' }[ext] ?? null);
  if (!kind) return 'Formato no admitido. Sube un archivo PNG, JPG o SVG.';
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `El archivo pesa ${(file.size / 1048576).toFixed(1)} MB. El máximo es ${MAX_FILE_MB} MB.`;
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

function kindOf(file) {
  const ext = extOf(file.name);
  return TYPES[file.type] || { png: 'png', jpg: 'jpg', jpeg: 'jpg', svg: 'svg' }[ext];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = url;
  });
}

async function svgToUrl(file) {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) {
    throw new Error('El SVG no es válido o está dañado.');
  }
  // Elimina scripts y manejadores por seguridad (además, <img> no los ejecuta).
  svg.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
  let w = parseFloat(svg.getAttribute('width'));
  let h = parseFloat(svg.getAttribute('height'));
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if ((!w || !h || /%/.test(svg.getAttribute('width') || '')) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    w = vb[2];
    h = vb[3];
  }
  if (!w || !h) {
    w = 1000;
    h = 1000;
  }
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const k = MAX_SIDE / Math.max(w, h);
  svg.setAttribute('width', String(Math.round(w * k)));
  svg.setAttribute('height', String(Math.round(h * k)));
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

/** Lee el archivo y devuelve un canvas RGBA (máx. MAX_SIDE px por lado). */
export async function fileToCanvas(file) {
  const kind = kindOf(file);
  const url = kind === 'svg' ? await svgToUrl(file) : URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(url);
  } catch {
    throw new Error(kind === 'svg' ? 'No se pudo interpretar el SVG. Prueba exportarlo como PNG.' : 'No se pudo leer la imagen. ¿El archivo está dañado?');
  } finally {
    URL.revokeObjectURL(url);
  }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error('La imagen no tiene dimensiones válidas.');
  if (Math.max(iw, ih) < MIN_SIDE) throw new Error(`La imagen es demasiado pequeña (mínimo ${MIN_SIDE} px).`);
  const k = Math.min(1, MAX_SIDE / Math.max(iw, ih));
  const c = document.createElement('canvas');
  c.width = Math.round(iw * k);
  c.height = Math.round(ih * k);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { canvas: c, kind };
}

/** Analiza el borde: ¿ya es transparente? ¿cuál es el color de fondo dominante? */
export function analyzeBorder(canvas) {
  const { width: w, height: h } = canvas;
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const buckets = new Map();
  let total = 0;
  let transparent = 0;
  const visit = (x, y) => {
    const i = (y * w + x) * 4;
    total++;
    if (data[i + 3] < 200) {
      transparent++;
      return;
    }
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    b.n++;
    b.r += data[i];
    b.g += data[i + 1];
    b.b += data[i + 2];
    buckets.set(key, b);
  };
  for (let x = 0; x < w; x++) {
    visit(x, 0);
    visit(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    visit(0, y);
    visit(w - 1, y);
  }
  let best = null;
  for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
  const opaque = total - transparent;
  return {
    alreadyTransparent: transparent / total > 0.5,
    bg: best ? [best.r / best.n, best.g / best.n, best.b / best.n] : [255, 255, 255],
    uniformity: best && opaque ? best.n / opaque : 0,
  };
}

/**
 * Elimina el fondo.
 * tolerance: 0..100 · interior: también quita el color de fondo encerrado (huecos de letras).
 */
export function removeBackground(canvas, { tolerance = 30, interior = false } = {}) {
  const { width: w, height: h } = canvas;
  const src = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const d = src.data;
  const { bg } = analyzeBorder(canvas);
  const [br, bgc, bb] = bg;
  const T = 6 + tolerance * 1.5;
  const F = 22 + tolerance * 0.3;
  const n = w * h;
  const dist = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const dr = d[i] - br;
    const dg = d[i + 1] - bgc;
    const db = d[i + 2] - bb;
    // ponderación perceptual aproximada
    dist[p] = Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db) * 1.6;
    if (d[i + 3] < 16) dist[p] = 0;
  }
  const state = new Uint8Array(n); // 0 = objeto, 1 = fondo, 2 = transición
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const seed = (p) => {
    if (state[p] === 0 && dist[p] <= T) {
      state[p] = 1;
      queue[qt++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  const tryN = (q) => {
    if (state[q] === 1) return;
    if (dist[q] <= T) {
      state[q] = 1;
      queue[qt++] = q;
    } else if (dist[q] < T + F) {
      state[q] = 2;
    }
  };
  while (qh < qt) {
    const p = queue[qh++];
    const x = p % w;
    if (x > 0) tryN(p - 1);
    if (x < w - 1) tryN(p + 1);
    if (p >= w) tryN(p - w);
    if (p < n - w) tryN(p + w);
  }
  if (interior) {
    for (let p = 0; p < n; p++) {
      if (state[p] === 1) continue;
      if (dist[p] <= T) state[p] = 1;
      else if (dist[p] < T + F) state[p] = 2;
    }
  }
  const out = new ImageData(w, h);
  const o = out.data;
  let removed = 0;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const s = state[p];
    if (s === 1) {
      removed++;
      continue; // alfa 0
    }
    let a = 1;
    if (s === 2) a = Math.min(1, Math.max(0, (dist[p] - T) / F));
    if (a <= 0.02) {
      removed++;
      continue;
    }
    if (a < 1) {
      // quita el tinte del fondo en el píxel semitransparente
      o[i] = Math.min(255, Math.max(0, (d[i] - br * (1 - a)) / a));
      o[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - bgc * (1 - a)) / a));
      o[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - bb * (1 - a)) / a));
    } else {
      o[i] = d[i];
      o[i + 1] = d[i + 1];
      o[i + 2] = d[i + 2];
    }
    o[i + 3] = Math.round(d[i + 3] * a);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d', { willReadFrequently: true }).putImageData(out, 0, 0);
  return { canvas: c, removedRatio: removed / n };
}

/** Recorta márgenes transparentes para que el encaje en la bolsa sea exacto. */
export function trimTransparent(canvas, pad = 2) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null; // imagen vacía
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  const c = document.createElement('canvas');
  c.width = x1 - x0 + 1;
  c.height = y1 - y0 + 1;
  c.getContext('2d', { willReadFrequently: true }).drawImage(canvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

/**
 * Proporción de píxeles visibles del logo con poco contraste respecto a la bolsa.
 * bag: 'negra' → cuenta píxeles oscuros; 'blanca' → cuenta píxeles muy claros.
 */
export function lowContrastRatio(canvas, bag) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let low = 0;
  let cnt = 0;
  const step = Math.max(1, Math.floor((w * h) / 40000)) * 4;
  for (let i = 0; i < d.length; i += step) {
    if (d[i + 3] > 128) {
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      if (bag === 'negra' ? l < 0.22 : l > 0.86) low++;
      cnt++;
    }
  }
  return cnt ? low / cnt : 0;
}

/* ---------- logotipo tipográfico (sin IA) ---------- */

export function makeTypoLogo(name, style, color) {
  const text = (name || '').trim() || 'Tu marca';
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const serif = '"Cormorant Garamond", Georgia, serif';
  const sans = 'Montserrat, system-ui, sans-serif';
  const spacing = (px) => {
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
  };
  if (style === 'monograma') {
    const initial = text.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase() || 'A';
    const size = 900;
    const nameSize = 92;
    ctx.font = `500 ${nameSize}px ${sans}`;
    spacing(nameSize * 0.32);
    const upper = text.toUpperCase();
    const tw = Math.min(ctx.measureText(upper).width, 2400);
    c.width = Math.max(size, tw + 40);
    c.height = size + nameSize * 2.2;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    const cx = c.width / 2;
    const r = size * 0.42;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, size / 2, r - 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `500 ${size * 0.5}px ${serif}`;
    spacing(0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, cx, size / 2 + size * 0.02);
    ctx.font = `500 ${nameSize}px ${sans}`;
    spacing(nameSize * 0.32);
    ctx.textBaseline = 'alphabetic';
    const fitK = Math.min(1, (c.width - 40) / tw);
    ctx.save();
    ctx.translate(cx + (nameSize * 0.16), size + nameSize * 1.45);
    ctx.scale(fitK, 1);
    ctx.fillText(upper, 0, 0);
    ctx.restore();
    return trimTransparent(c, 4) || c;
  }
  // clásico: nombre en serif con filete ornamental; nombres largos en dos líneas
  const size = 260;
  const words = text.split(/\s+/);
  let lines = [text];
  if (text.length > 14 && words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b2 = words.slice(i).join(' ');
      const score = Math.abs(a.length - b2.length);
      if (!best || score < best.score) best = { lines: [a, b2], score };
    }
    lines = best.lines;
  }
  const lineH = size * 1.0;
  ctx.font = `500 ${size}px ${serif}`;
  spacing(size * 0.08);
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  c.width = Math.ceil(tw + 80);
  c.height = Math.ceil(size * 0.75 + lines.length * lineH + size * 0.5);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.font = `500 ${size}px ${serif}`;
  spacing(size * 0.08);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2 + size * 0.04, size * 1.02 + i * lineH));
  const ly = size * 1.02 + (lines.length - 1) * lineH + size * 0.36;
  ctx.lineWidth = 6;
  const half = Math.min(c.width * 0.28, 320);
  ctx.beginPath();
  ctx.moveTo(c.width / 2 - half, ly);
  ctx.lineTo(c.width / 2 - 30, ly);
  ctx.moveTo(c.width / 2 + 30, ly);
  ctx.lineTo(c.width / 2 + half, ly);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.width / 2, ly, 9, 0, Math.PI * 2);
  ctx.fill();
  return trimTransparent(c, 4) || c;
}
