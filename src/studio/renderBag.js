// Motor de montaje 2.5D determinista (Canvas 2D).
// Dibuja una bolsa stand-up original (sin marcas de terceros), imprime logo y etiqueta
// en una capa plana, la deforma sobre la curvatura del frente y aplica la iluminación
// encima, para que la impresión herede pliegues, brillos y sombras de la bolsa.

export const SCENE = { w: 1000, h: 1100, floor: 1010 };

export const FORMATS = {
  '250': { id: '250', label: '250 g', bodyW: 590, bodyH: 620, sealH: 42, zip: 30 },
  '1000': { id: '1000', label: '1 kg', bodyW: 460, bodyH: 880, sealH: 50, zip: 38 },
};

const PALETTE = {
  negra: {
    base: '#1b1a19',
    seal: '#222120',
    label: '#F6F3EE',
    labelInk: '#141414',
    labelLine: 'rgba(20,20,20,0.55)',
    mono: '#F4F1EC',
    backdrop: ['#F3E9DE', '#E4D2BF'],
    edgeDark: 0.62,
    edgeMid: 0.32,
    spec: 0.2,
    creaseHi: 0.035,
    creaseLo: 0.22,
    noise: 0.07,
    vert: 1,
  },
  blanca: {
    base: '#F8F7F3',
    seal: '#F1EFEA',
    label: '#161514',
    labelInk: '#F4F1EC',
    labelLine: 'rgba(244,241,236,0.55)',
    mono: '#161514',
    backdrop: ['#D9C6B2', '#BFA68C'],
    edgeDark: 0.3,
    edgeMid: 0.1,
    spec: 0.22,
    creaseHi: 0.25,
    creaseLo: 0.07,
    noise: 0.035,
    vert: 0.55,
  },
};

export const LABEL_FONT = '"Cormorant Garamond", Georgia, serif';
export const SANS_FONT = 'Montserrat, system-ui, sans-serif';

/* ---------- utilidades ---------- */

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

let noiseTile = null;
function getNoise() {
  if (noiseTile) return noiseTile;
  const size = 256;
  noiseTile = makeCanvas(size, size);
  const ctx = noiseTile.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + rnd() * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return noiseTile;
}

export function getGeometry(formatId) {
  const f = FORMATS[formatId];
  // bolsa centrada verticalmente en la escena, apoyada sobre su sombra
  const yB = Math.round((SCENE.h + f.bodyH) / 2 + 24);
  const yT = yB - f.bodyH;
  return { ...f, cx: SCENE.w / 2, hw: f.bodyW / 2, yT, yB, h: f.bodyH };
}

function bodyPath(ctx, g) {
  const { cx, hw, yT, yB, h, sealH } = g;
  const r = 5;
  ctx.beginPath();
  ctx.moveTo(cx - hw + r, yT);
  ctx.lineTo(cx + hw - r, yT);
  ctx.quadraticCurveTo(cx + hw, yT, cx + hw, yT + r);
  ctx.lineTo(cx + hw, yT + sealH);
  ctx.bezierCurveTo(cx + hw * 1.02, yT + sealH + h * 0.2, cx + hw * 1.045, yT + h * 0.62, cx + hw * 1.032, yB - h * 0.075);
  ctx.quadraticCurveTo(cx + hw * 1.02, yB, cx + hw * 0.87, yB);
  ctx.quadraticCurveTo(cx, yB + 9, cx - hw * 0.87, yB);
  ctx.quadraticCurveTo(cx - hw * 1.02, yB, cx - hw * 1.032, yB - h * 0.075);
  ctx.bezierCurveTo(cx - hw * 1.045, yT + h * 0.62, cx - hw * 1.02, yT + sealH + h * 0.2, cx - hw, yT + sealH);
  ctx.lineTo(cx - hw, yT + r);
  ctx.quadraticCurveTo(cx - hw, yT, cx - hw + r, yT);
  ctx.closePath();
}

/* ---------- layout de impresión (coordenadas planas del frente) ---------- */

export function getPrintLayout(formatId) {
  const g = getGeometry(formatId);
  const w = g.bodyW;
  const h = g.h;
  const is1kg = formatId === '1000';
  const labelW = w * (is1kg ? 0.64 : 0.6);
  const labelH = h * (is1kg ? 0.15 : 0.19);
  const labelBottom = h * (is1kg ? 0.905 : 0.885);
  const label = { x: (w - labelW) / 2, y: labelBottom - labelH, w: labelW, h: labelH };
  const zoneTop = g.sealH + g.zip + h * (is1kg ? 0.045 : 0.05);
  // Caja automática: mitad superior, por encima del centro.
  const auto = { x: w * 0.17, y: zoneTop, w: w * 0.66, h: h * 0.5 - zoneTop - h * 0.02 };
  // Límites seguros para ajuste manual: nunca invade la etiqueta.
  const safe = { x: w * 0.1, y: zoneTop, w: w * 0.8, h: label.y - h * 0.045 - zoneTop };
  return { w, h, label, auto, safe };
}

/**
 * Calcula el rectángulo del logo (coords planas) respetando la proporción original.
 * controls: { scale: 50..160 (%), x: -100..100, y: -100..100 }
 */
export function getLogoRect(formatId, aspect, controls) {
  const L = getPrintLayout(formatId);
  const { auto, safe } = L;
  // Tamaño base: contener dentro de la caja automática.
  let bw = auto.w * 0.92;
  let bh = bw / aspect;
  if (bh > auto.h * 0.92) {
    bh = auto.h * 0.92;
    bw = bh * aspect;
  }
  const s = (controls?.scale ?? 100) / 100;
  let w = bw * s;
  let h = bh * s;
  // Nunca exceder los límites seguros.
  const fit = Math.min(1, safe.w / w, safe.h / h);
  w *= fit;
  h *= fit;
  const defCx = auto.x + auto.w / 2;
  const defCy = auto.y + auto.h / 2;
  const minCx = safe.x + w / 2;
  const maxCx = safe.x + safe.w - w / 2;
  const minCy = safe.y + h / 2;
  const maxCy = safe.y + safe.h - h / 2;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const baseCx = clamp(defCx, minCx, maxCx);
  const baseCy = clamp(defCy, minCy, maxCy);
  const vx = (controls?.x ?? 0) / 100;
  const vy = (controls?.y ?? 0) / 100;
  const cx = vx < 0 ? baseCx + vx * (baseCx - minCx) : baseCx + vx * (maxCx - baseCx);
  const cy = vy < 0 ? baseCy + vy * (baseCy - minCy) : baseCy + vy * (maxCy - baseCy);
  return {
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
    travel: { left: baseCx - minCx, right: maxCx - baseCx, up: baseCy - minCy, down: maxCy - baseCy },
  };
}

/* ---------- texto de la etiqueta ---------- */

function setSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function fitBrandText(ctx, text, maxW, maxH, maxSize, minSize) {
  const font = (size) => `600 ${size}px ${LABEL_FONT}`;
  const spacing = (size) => size * 0.06;
  const measure = (t, size) => {
    ctx.font = font(size);
    setSpacing(ctx, spacing(size));
    return ctx.measureText(t).width;
  };
  for (let size = maxSize; size >= minSize; size -= 1) {
    if (measure(text, size) <= maxW && size <= maxH) return { lines: [text], size, font: font(size), spacing: spacing(size) };
  }
  // Dos líneas: busca el corte más equilibrado entre palabras.
  const words = text.split(/\s+/);
  if (words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const score = Math.abs(a.length - b.length);
      if (!best || score < best.score) best = { a, b, score };
    }
    for (let size = Math.min(maxSize, maxH / 2.1); size >= minSize * 0.8; size -= 1) {
      if (Math.max(measure(best.a, size), measure(best.b, size)) <= maxW) {
        return { lines: [best.a, best.b], size, font: font(size), spacing: spacing(size) };
      }
    }
  }
  // Último recurso: una línea al tamaño mínimo, recortada con elipsis.
  let t = text;
  const size = minSize * 0.8;
  while (t.length > 1 && measure(t + '…', size) > maxW) t = t.slice(0, -1);
  return { lines: [t + '…'], size, font: font(size), spacing: spacing(size) };
}

function drawLabel(ctx, L, pal, brand, formatLabel) {
  const { x, y, w, h } = L.label;
  ctx.save();
  ctx.fillStyle = pal.label;
  ctx.fillRect(x, y, w, h);
  // filete interior
  const inset = Math.min(w, h) * 0.075;
  ctx.strokeStyle = pal.labelLine;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);

  const padX = inset * 2.4;
  const maxW = w - padX * 2;
  const gramSize = h * 0.125;
  const brandZoneH = h * 0.52;
  const fit = fitBrandText(ctx, brand, maxW, brandZoneH, h * 0.34, h * 0.13);

  const lineGap = fit.size * 1.02;
  const blockH = fit.lines.length * lineGap;
  const ruleGap = h * 0.075;
  const totalH = blockH + ruleGap * 2 + gramSize;
  let cy = y + (h - totalH) / 2 + fit.size * 0.8;

  ctx.fillStyle = pal.labelInk;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = fit.font;
  setSpacing(ctx, fit.spacing);
  fit.lines.forEach((line, i) => {
    // letterSpacing añade espacio al final: compensa para centrar
    ctx.fillText(line, x + w / 2 + fit.spacing / 2, cy + i * lineGap);
  });
  const ruleY = cy + (fit.lines.length - 1) * lineGap + fit.size * 0.28 + ruleGap * 0.6;
  ctx.strokeStyle = pal.labelLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - w * 0.07, ruleY);
  ctx.lineTo(x + w / 2 + w * 0.07, ruleY);
  ctx.stroke();

  ctx.font = `500 ${gramSize}px ${SANS_FONT}`;
  setSpacing(ctx, gramSize * 0.28);
  ctx.fillText(formatLabel, x + w / 2 + gramSize * 0.14, ruleY + ruleGap + gramSize * 0.85);
  setSpacing(ctx, 0);
  ctx.restore();
}

/* ---------- logo ---------- */

const tintCache = new WeakMap();
function tinted(src, color) {
  let m = tintCache.get(src);
  if (!m) {
    m = new Map();
    tintCache.set(src, m);
  }
  if (m.has(color)) return m.get(color);
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  m.set(color, c);
  return c;
}

/* ---------- escena ---------- */

function warpPrint(ctx, print, g, scale) {
  const tMax = 0.82;
  const sMax = Math.sin(tMax);
  const W = print.width;
  const H = print.height;
  const x0 = Math.round((g.cx - g.hw) * scale);
  const destW = Math.round(g.bodyW * scale);
  const y0 = g.yT * scale;
  const A = 9 * scale; // intensidad de la perspectiva vertical
  const eye = 0.42; // altura relativa del horizonte
  const uAt = (i) => ((Math.asin(((i / destW) * 2 - 1) * sMax) / tMax + 1) / 2) * W;
  for (let i = 0; i < destW; i++) {
    const u0 = uAt(i);
    const u1 = uAt(i + 1);
    const s = ((i + 0.5) / destW) * 2 - 1;
    const th = Math.asin(s * sMax);
    const f = (1 - Math.cos(th)) / (1 - Math.cos(tMax));
    const dTop = A * f * eye;
    const dBot = -A * f * (1 - eye);
    ctx.drawImage(print, u0, 0, Math.max(u1 - u0, 0.35), H, x0 + i, y0 + dTop, 1.4, H + dBot - dTop);
  }
}

function softStroke(ctx, pts, color, alpha, widths) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const lw of widths) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
    ctx.stroke();
  }
  ctx.restore();
}

function crease(ctx, pts, pal, strength = 1) {
  const off = (d) => pts.map(([x, y]) => [x + d, y - d * 0.6]);
  softStroke(ctx, off(-4), '#000', pal.creaseLo * 0.22 * strength, [34, 22, 12, 5]);
  softStroke(ctx, off(4), '#fff', pal.creaseHi * 0.3 * strength, [30, 18, 8]);
}

function drawCreases(ctx, g, pal) {
  const { cx, hw, yT, yB, h, sealH, zip } = g;
  const rnd = mulberry32(g.id === '1000' ? 21 : 34);
  const j = (v) => (rnd() - 0.5) * v;
  const top = yT + sealH + zip;
  // tensión del llenado: pliegues cortos y curvos desde las esquinas superiores
  crease(ctx, [[cx - hw * 0.99, yT + sealH + 6], [cx - hw * 0.9, top + h * 0.02], [cx - hw * 0.8 + j(10), top + h * 0.06], [cx - hw * 0.66 + j(14), top + h * 0.085]], pal, 1);
  crease(ctx, [[cx + hw * 0.99, yT + sealH + 6], [cx + hw * 0.9, top + h * 0.018], [cx + hw * 0.8 + j(10), top + h * 0.05], [cx + hw * 0.68 + j(14), top + h * 0.075]], pal, 0.9);
  // ondulaciones suaves bajo el cierre
  for (let k = 0; k < 4; k++) {
    const x = cx - hw * 0.62 + k * hw * 0.4 + j(30);
    crease(ctx, [[x, top + 5], [x + 10 + j(6), top + 12], [x + 18, top + 20 + j(6)], [x + 24 + j(6), top + 28]], pal, 0.35);
  }
  // fuelle inferior: desde las esquinas, sin cruzar la etiqueta
  crease(ctx, [[cx - hw * 1.02, yB - h * 0.035], [cx - hw * 0.95, yB - h * 0.06], [cx - hw * 0.86 + j(8), yB - h * 0.085], [cx - hw * 0.74 + j(8), yB - h * 0.1]], pal, 0.9);
  crease(ctx, [[cx + hw * 1.02, yB - h * 0.03], [cx + hw * 0.95, yB - h * 0.055], [cx + hw * 0.86 + j(8), yB - h * 0.08], [cx + hw * 0.75 + j(8), yB - h * 0.095]], pal, 0.9);
  crease(ctx, [[cx - hw * 0.55, yB - 4], [cx - hw * 0.25, yB - h * 0.018], [cx + hw * 0.2, yB - h * 0.02], [cx + hw * 0.55, yB - 3]], pal, 0.5);
}

function drawShading(ctx, g, pal) {
  const { cx, hw, yT, yB, h, sealH } = g;
  // Volumen horizontal (cilindro)
  let gr = ctx.createLinearGradient(cx - hw * 1.05, 0, cx + hw * 1.05, 0);
  gr.addColorStop(0, `rgba(0,0,0,${pal.edgeDark})`);
  gr.addColorStop(0.1, `rgba(0,0,0,${pal.edgeMid})`);
  gr.addColorStop(0.3, 'rgba(0,0,0,0.04)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0)');
  gr.addColorStop(0.78, 'rgba(0,0,0,0.08)');
  gr.addColorStop(0.92, `rgba(0,0,0,${pal.edgeMid * 1.25})`);
  gr.addColorStop(1, `rgba(0,0,0,${pal.edgeDark * 1.1})`);
  ctx.fillStyle = gr;
  ctx.fillRect(cx - hw * 1.1, yT, hw * 2.2, h + 20);

  // Hundimiento bajo el sello y curvatura del fondo
  gr = ctx.createLinearGradient(0, yT + sealH, 0, yT + sealH + h * 0.14);
  gr.addColorStop(0, `rgba(0,0,0,${0.32 * pal.vert})`);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(cx - hw * 1.1, yT + sealH, hw * 2.2, h * 0.14);
  gr = ctx.createLinearGradient(0, yB - h * 0.16, 0, yB + 10);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.7, `rgba(0,0,0,${0.16 * pal.vert})`);
  gr.addColorStop(1, `rgba(0,0,0,${0.42 * pal.vert})`);
  ctx.fillStyle = gr;
  ctx.fillRect(cx - hw * 1.1, yB - h * 0.16, hw * 2.2, h * 0.16 + 12);

  drawCreases(ctx, g, pal);

  // Brillos especulares (luz de ventana a la izquierda)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const strip = (center, width, a) => {
    const s = ctx.createLinearGradient(center - width, 0, center + width, 0);
    s.addColorStop(0, 'rgba(255,255,255,0)');
    s.addColorStop(0.5, `rgba(255,255,255,${a})`);
    s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(center - width, yT + sealH, width * 2, h - sealH);
  };
  strip(cx - hw * 0.36, hw * 0.38, pal.spec * 0.85);
  strip(cx - hw * 0.5, hw * 0.1, pal.spec * 0.45);
  strip(cx + hw * 0.64, hw * 0.16, pal.spec * 0.28);
  ctx.restore();

  // Atenuación vertical del brillo hacia arriba y abajo
  gr = ctx.createLinearGradient(0, yT, 0, yB);
  gr.addColorStop(0, 'rgba(0,0,0,0.1)');
  gr.addColorStop(0.35, 'rgba(0,0,0,0)');
  gr.addColorStop(0.75, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = gr;
  ctx.fillRect(cx - hw * 1.1, yT, hw * 2.2, h + 12);

  // Textura del material
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = pal.noise * 2.2;
  ctx.fillStyle = ctx.createPattern(getNoise(), 'repeat');
  ctx.fillRect(cx - hw * 1.1, yT, hw * 2.2, h + 12);
  ctx.restore();
}

function drawSeal(ctx, g, pal) {
  const { cx, hw, yT, sealH, zip } = g;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - hw, yT, hw * 2, sealH);
  ctx.clip();
  ctx.fillStyle = pal.seal;
  ctx.fillRect(cx - hw, yT, hw * 2, sealH);
  // estriado del termosellado
  for (let x = cx - hw; x < cx + hw; x += 3.2) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, yT + sealH * 0.22, 1.2, sealH * 0.56);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x + 1.4, yT + sealH * 0.22, 1, sealH * 0.56);
  }
  let gr = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.28)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.06)');
  gr.addColorStop(0.7, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = gr;
  ctx.fillRect(cx - hw, yT, hw * 2, sealH);
  gr = ctx.createLinearGradient(0, yT, 0, yT + sealH);
  gr.addColorStop(0, 'rgba(255,255,255,0.14)');
  gr.addColorStop(0.15, 'rgba(255,255,255,0)');
  gr.addColorStop(0.85, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = gr;
  ctx.fillRect(cx - hw, yT, hw * 2, sealH);
  ctx.restore();

  // cierre zip
  const zy = yT + sealH + zip;
  const zipLine = (dy, color, lw) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 1.02, zy + dy + 2);
    ctx.quadraticCurveTo(cx, zy + dy - 3, cx + hw * 1.02, zy + dy + 2);
    ctx.stroke();
  };
  zipLine(-2.5, 'rgba(0,0,0,0.35)', 3);
  zipLine(0, 'rgba(255,255,255,0.16)', 1.6);
  zipLine(3, 'rgba(0,0,0,0.18)', 2);

  // muescas de apertura
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const ny = yT + sealH + 12;
  ctx.beginPath();
  ctx.moveTo(cx - hw - 2, ny - 6);
  ctx.lineTo(cx - hw + 9, ny);
  ctx.lineTo(cx - hw - 2, ny + 6);
  ctx.moveTo(cx + hw * 1.012 + 2, ny - 6);
  ctx.lineTo(cx + hw * 1.012 - 9, ny);
  ctx.lineTo(cx + hw * 1.012 + 2, ny + 6);
  ctx.fill();
  ctx.restore();
}

/**
 * Renderiza la escena completa.
 * opts: { bag, format, brand, logo (canvas|null), logoColor, controls, transparent }
 */
export function renderScene(canvas, opts, scale = 1) {
  const pal = PALETTE[opts.bag] || PALETTE.negra;
  const g = getGeometry(opts.format);
  const L = getPrintLayout(opts.format);
  const W = Math.round(SCENE.w * scale);
  const H = Math.round(SCENE.h * scale);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. fondo de estudio
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (!opts.transparent) {
    const bg = ctx.createLinearGradient(0, 0, 0, SCENE.h);
    bg.addColorStop(0, pal.backdrop[0]);
    bg.addColorStop(1, pal.backdrop[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SCENE.w, SCENE.h);
    const vg = ctx.createRadialGradient(SCENE.w * 0.42, SCENE.h * 0.35, 80, SCENE.w * 0.5, SCENE.h * 0.5, SCENE.w * 0.85);
    vg.addColorStop(0, 'rgba(255,255,255,0.35)');
    vg.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, SCENE.w, SCENE.h);
  }

  // 2. sombra de contacto
  ctx.save();
  ctx.translate(g.cx + 14, g.yB + 4);
  ctx.scale(1, 0.16);
  let sh = ctx.createRadialGradient(0, 0, 10, 0, 0, g.hw * 1.35);
  sh.addColorStop(0, 'rgba(30,18,10,0.5)');
  sh.addColorStop(0.55, 'rgba(30,18,10,0.2)');
  sh.addColorStop(1, 'rgba(30,18,10,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, g.hw * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(g.cx, g.yB + 1);
  ctx.scale(1, 0.05);
  sh = ctx.createRadialGradient(0, 0, 4, 0, 0, g.hw * 0.95);
  sh.addColorStop(0, 'rgba(10,6,4,0.75)');
  sh.addColorStop(1, 'rgba(10,6,4,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, g.hw * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. capa plana de impresión (logo + etiqueta)
  const print = makeCanvas(L.w * scale, L.h * scale);
  const pctx = print.getContext('2d');
  pctx.setTransform(scale, 0, 0, scale, 0, 0);
  pctx.imageSmoothingQuality = 'high';
  let logoRect = null;
  if (opts.logo) {
    logoRect = getLogoRect(opts.format, opts.logo.width / opts.logo.height, opts.controls);
    const src = opts.logoColor === 'mono' ? tinted(opts.logo, pal.mono) : opts.logo;
    pctx.drawImage(src, logoRect.x, logoRect.y, logoRect.w, logoRect.h);
  }
  const brand = (opts.brand || '').trim() || 'Tu marca';
  drawLabel(pctx, L, pal, brand, FORMATS[opts.format].label);

  // 4. bolsa en su propia capa
  const layer = makeCanvas(W, H);
  const lctx = layer.getContext('2d');
  lctx.imageSmoothingQuality = 'high';
  lctx.setTransform(scale, 0, 0, scale, 0, 0);
  lctx.save();
  bodyPath(lctx, g);
  lctx.clip();
  lctx.fillStyle = pal.base;
  lctx.fillRect(0, 0, SCENE.w, SCENE.h);
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  warpPrint(lctx, print, g, scale);
  lctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawShading(lctx, g, pal);
  lctx.restore();
  drawSeal(lctx, g, pal);

  // borde: luz de contorno y definición
  lctx.save();
  bodyPath(lctx, g);
  lctx.clip();
  lctx.strokeStyle = opts.bag === 'negra' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)';
  lctx.lineWidth = 3;
  bodyPath(lctx, g);
  lctx.stroke();
  lctx.restore();
  lctx.strokeStyle = opts.bag === 'negra' ? 'rgba(0,0,0,0.6)' : 'rgba(60,45,35,0.35)';
  lctx.lineWidth = 1;
  bodyPath(lctx, g);
  lctx.stroke();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);

  // rectángulo del logo en coordenadas de escena (para arrastrar)
  let sceneLogoRect = null;
  if (logoRect) {
    sceneLogoRect = { x: g.cx - g.hw + logoRect.x, y: g.yT + logoRect.y, w: logoRect.w, h: logoRect.h, travel: logoRect.travel };
  }
  return { logoRect: sceneLogoRect };
}
