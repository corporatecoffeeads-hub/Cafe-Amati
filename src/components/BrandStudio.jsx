import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Segmented, Slider } from './ui.jsx';
import { waLink } from '../data/site.js';
import { renderScene, SCENE, FORMATS } from '../studio/renderBag.js';
import {
  validateFile,
  fileToCanvas,
  analyzeBorder,
  removeBackground,
  trimTransparent,
  lowContrastRatio,
  makeTypoLogo,
  MAX_FILE_MB,
} from '../studio/logoTools.js';

const DEFAULT_CONTROLS = { scale: 100, x: 0, y: 0 };
const EMPTY_UPLOAD = {
  name: '',
  original: null,
  originalTrim: null,
  processed: null,
  alreadyTransparent: false,
  uniformity: 1,
  useProcessed: true,
  tolerance: 30,
  interior: false,
  status: 'idle', // idle | loading | processing | done | error
  error: '',
};
const MAX_BRAND = 32;

function sanitizeBrand(v) {
  return v.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s{2,}/g, ' ').slice(0, MAX_BRAND);
}

function slug(s) {
  return (
    (s || 'mi-marca')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'mi-marca'
  );
}

function BagIcon({ tone, tall }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden="true">
      <rect
        x={tall ? 4 : 2}
        y={tall ? 1 : 6}
        width={tall ? 10 : 14}
        height={tall ? 20 : 15}
        rx="1.6"
        fill={tone === 'negra' ? '#1b1a19' : tone === 'blanca' ? '#F2F0EB' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function Checker({ children, className = '' }) {
  return <div className={`checker flex items-center justify-center overflow-hidden rounded-xl ${className}`}>{children}</div>;
}

function CanvasThumb({ source, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !source) return;
    const max = 360;
    const k = Math.min(1, max / Math.max(source.width, source.height));
    c.width = Math.max(1, Math.round(source.width * k));
    c.height = Math.max(1, Math.round(source.height * k));
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(source, 0, 0, c.width, c.height);
  }, [source]);
  return <canvas ref={ref} role="img" aria-label={label} className="max-h-full max-w-full object-contain" />;
}

export default function BrandStudio() {
  const [brand, setBrand] = useState('');
  const [bag, setBag] = useState('negra');
  const [format, setFormat] = useState('1000');
  const [logoMode, setLogoMode] = useState('none'); // none | upload | skip | typo
  const [typoStyle, setTypoStyle] = useState('clasico');
  const [logoColor, setLogoColor] = useState('original');
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  const [upload, setUpload] = useState(EMPTY_UPLOAD);
  const [fontsReady, setFontsReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [transparentBg, setTransparentBg] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announce, setAnnounce] = useState('');

  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const logoRectRef = useRef(null);
  const dragRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Fuentes de la etiqueta listas antes de dibujar en canvas
  useEffect(() => {
    let alive = true;
    const loads = ['600 40px "Cormorant Garamond"', '500 40px "Cormorant Garamond"', '500 20px Montserrat'].map((f) =>
      document.fonts ? document.fonts.load(f) : Promise.resolve(),
    );
    Promise.all(loads)
      .catch(() => {})
      .finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Tamaño del lienzo de vista previa
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Eliminación de fondo (local) cuando cambia el archivo o los parámetros
  useEffect(() => {
    if (!upload.original || upload.alreadyTransparent) return;
    let cancelled = false;
    setUpload((u) => ({ ...u, status: 'processing' }));
    const t = setTimeout(() => {
      try {
        const { canvas } = removeBackground(upload.original, { tolerance: upload.tolerance, interior: upload.interior });
        const trimmed = trimTransparent(canvas);
        if (cancelled) return;
        if (!trimmed) {
          setUpload((u) => ({ ...u, processed: null, status: 'done', error: 'Con esta tolerancia se borró todo el logo. Bájala o usa el original.' }));
        } else {
          setUpload((u) => ({ ...u, processed: trimmed, status: 'done', error: '' }));
        }
      } catch {
        if (!cancelled) setUpload((u) => ({ ...u, status: 'done', processed: null, error: 'No se pudo quitar el fondo de esta imagen. Se usará el original.' }));
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [upload.original, upload.alreadyTransparent, upload.tolerance, upload.interior]);

  const typoColor = bag === 'negra' ? '#F4F1EC' : '#161514';
  const logoCanvas = useMemo(() => {
    if (logoMode === 'upload') {
      if (upload.useProcessed && upload.processed && !upload.alreadyTransparent) return upload.processed;
      return upload.originalTrim;
    }
    if (logoMode === 'typo' && fontsReady) return makeTypoLogo(brand, typoStyle, typoColor);
    return null;
  }, [logoMode, upload.useProcessed, upload.processed, upload.originalTrim, upload.alreadyTransparent, brand, typoStyle, typoColor, fontsReady]);

  const contrastHint = useMemo(() => {
    if (logoMode !== 'upload' || !logoCanvas || logoColor !== 'original') return '';
    const ratio = lowContrastRatio(logoCanvas, bag);
    if (ratio < 0.3) return '';
    if (bag === 'negra') return 'Tu logo es oscuro y se verá poco sobre la bolsa negra. Prueba la versión monocromática.';
    return 'Tu logo es muy claro y se verá poco sobre la bolsa blanca. Prueba la versión monocromática.';
  }, [logoMode, logoCanvas, logoColor, bag]);

  const sceneOpts = useMemo(
    () => ({ bag, format, brand, logo: logoCanvas, logoColor: logoMode === 'typo' ? 'original' : logoColor, controls }),
    [bag, format, brand, logoCanvas, logoColor, logoMode, controls],
  );

  // Render de la vista previa
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !width || !fontsReady) return;
    const id = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const res = renderScene(c, sceneOpts, (width * dpr) / SCENE.w);
      logoRectRef.current = res.logoRect;
    });
    return () => cancelAnimationFrame(id);
  }, [sceneOpts, width, fontsReady]);

  /* ---------- acciones ---------- */

  const handleFile = useCallback(async (file) => {
    const err = validateFile(file);
    if (err) {
      setUpload({ ...EMPTY_UPLOAD, status: 'error', error: err });
      return;
    }
    setUpload({ ...EMPTY_UPLOAD, name: file.name, status: 'loading' });
    setLogoMode('upload');
    try {
      const { canvas } = await fileToCanvas(file);
      const info = analyzeBorder(canvas);
      const originalTrim = trimTransparent(canvas) || canvas;
      const transparent = info.alreadyTransparent;
      setUpload({
        ...EMPTY_UPLOAD,
        name: file.name,
        original: canvas,
        originalTrim,
        alreadyTransparent: transparent,
        uniformity: info.uniformity,
        status: transparent ? 'done' : 'processing',
      });
      setControls(DEFAULT_CONTROLS);
      setLogoColor('original');
      setAnnounce(transparent ? 'Logo cargado. Ya tenía fondo transparente.' : 'Logo cargado. Quitando el fondo.');
    } catch (e) {
      setUpload({ ...EMPTY_UPLOAD, status: 'error', error: e.message || 'No se pudo leer el archivo.' });
      setLogoMode('none');
    }
  }, []);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const skipLogo = () => {
    setLogoMode('skip');
    setUpload(EMPTY_UPLOAD);
    setControls(DEFAULT_CONTROLS);
  };

  const reset = () => {
    setBrand('');
    setBag('negra');
    setFormat('1000');
    setLogoMode('none');
    setTypoStyle('clasico');
    setLogoColor('original');
    setControls(DEFAULT_CONTROLS);
    setUpload(EMPTY_UPLOAD);
    setTransparentBg(false);
    setAnnounce('Diseño reiniciado.');
  };

  const download = () => {
    if (!fontsReady) return;
    setDownloading(true);
    setTimeout(() => {
      try {
        const c = document.createElement('canvas');
        renderScene(c, { ...sceneOpts, transparent: transparentBg }, 3);
        c.toBlob((blob) => {
          setDownloading(false);
          if (!blob) {
            setAnnounce('No se pudo generar la imagen.');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${slug(brand)}-bolsa-${bag}-${format === '1000' ? '1kg' : '250g'}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          setAnnounce('Diseño descargado.');
        }, 'image/png');
      } catch {
        setDownloading(false);
        setAnnounce('No se pudo generar la imagen.');
      }
    }, 30);
  };

  /* ---------- arrastre del logo (mouse / lápiz) ---------- */

  const toScene = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SCENE.w, y: ((e.clientY - r.top) / r.height) * SCENE.h };
  };
  const hitLogo = (p) => {
    const lr = logoRectRef.current;
    return lr && p.x >= lr.x && p.x <= lr.x + lr.w && p.y >= lr.y && p.y <= lr.y + lr.h;
  };
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' || !logoCanvas) return;
    const p = toScene(e);
    if (!hitLogo(p)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const lr = logoRectRef.current;
    const offX = controls.x < 0 ? (controls.x / 100) * lr.travel.left : (controls.x / 100) * lr.travel.right;
    const offY = controls.y < 0 ? (controls.y / 100) * lr.travel.up : (controls.y / 100) * lr.travel.down;
    dragRef.current = { start: p, offX, offY, travel: lr.travel };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    const c = canvasRef.current;
    if (!dragRef.current) {
      if (e.pointerType !== 'touch' && c) c.style.cursor = logoCanvas && hitLogo(toScene(e)) ? 'grab' : 'default';
      return;
    }
    const p = toScene(e);
    const d = dragRef.current;
    const ox = d.offX + (p.x - d.start.x);
    const oy = d.offY + (p.y - d.start.y);
    const t = d.travel;
    const toCtl = (off, neg, pos) => {
      const v = off < 0 ? (neg ? (off / neg) * 100 : 0) : pos ? (off / pos) * 100 : 0;
      return Math.round(Math.max(-100, Math.min(100, v)));
    };
    setControls((cur) => ({ ...cur, x: toCtl(ox, t.left, t.right), y: toCtl(oy, t.up, t.down) }));
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const hasLogo = !!logoCanvas;
  const formatLabel = FORMATS[format].label;

  return (
    <section id="crea-tu-marca" className="relative scroll-mt-16 bg-grano text-crema" aria-labelledby="studio-title">
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8 lg:pb-28 lg:pt-28">
        <div className="max-w-2xl">
          <h2 id="studio-title" className="font-display text-[2.6rem] font-medium leading-[1.02] sm:text-6xl">
            Crea tu marca
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-arena/80">
            Pon tu nombre y tu logo en nuestras bolsas y mira cómo quedaría tu propio café. Elige color y formato; la vista previa se actualiza al instante.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-14">
          {/* Vista previa */}
          <div className="lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div ref={wrapRef} className="relative overflow-hidden rounded-[22px] bg-[#e9dccd] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
                <canvas
                  ref={canvasRef}
                  className={`block h-auto w-full ${dragging ? 'cursor-grabbing' : ''}`}
                  style={{ aspectRatio: `${SCENE.w} / ${SCENE.h}` }}
                  role="img"
                  aria-label={`Vista previa: bolsa ${bag} de ${formatLabel} con la marca ${brand.trim() || 'Tu marca'}${hasLogo ? ' y logotipo' : ''}.`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onPointerLeave={() => {
                    if (!dragRef.current && canvasRef.current) canvasRef.current.style.cursor = 'default';
                  }}
                />
                {!fontsReady && (
                  <div className="absolute inset-0 grid place-items-center text-sm text-grano/60">Preparando el estudio…</div>
                )}
                <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs text-crema backdrop-blur">
                  Bolsa {bag} · {formatLabel}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={download} disabled={downloading || !fontsReady} className="btn-primary">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {downloading ? 'Generando PNG…' : 'Descargar diseño'}
                </button>
                <button type="button" onClick={() => setBag((b) => (b === 'negra' ? 'blanca' : 'negra'))} className="btn-ghost-dark">
                  <BagIcon tone={bag === 'negra' ? 'blanca' : 'negra'} tall />
                  Ver en bolsa {bag === 'negra' ? 'blanca' : 'negra'}
                </button>
                <button type="button" onClick={reset} className="btn-ghost-dark">
                  Reiniciar diseño
                </button>
              </div>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px] text-arena/75">
                <input type="checkbox" checked={transparentBg} onChange={(e) => setTransparentBg(e.target.checked)} className="check" />
                Descargar con fondo transparente
              </label>
              <p className="mt-3 text-xs text-arena/50">Imagen referencial. Diseño sujeto a confirmación comercial.</p>
              <div className="mt-6 rounded-2xl border border-white/10 p-5">
                <p className="text-sm text-crema">¿Te gustó cómo quedó?</p>
                <p className="mt-1 text-[13px] text-arena/65">Descarga el diseño y envíanoslo para cotizar tu café con marca propia.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={waLink(`Hola, me interesa café con marca propia. Marca: ${brand.trim() || '(por definir)'}. Bolsa ${bag} de ${formatLabel}${hasLogo ? ', con logo' : ''}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    Consultar por WhatsApp
                  </a>
                  <a href="#contacto" className="btn-ghost-dark">
                    Ir al formulario
                  </a>
                </div>
              </div>
              {hasLogo && <p className="mt-1 hidden text-xs text-arena/40 md:block">Consejo: también puedes arrastrar el logo sobre la bolsa.</p>}
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-9 lg:order-1">
            <StepBlock n={1} title="Nombre de la marca">
              <label htmlFor="brand" className="sr-only">
                Nombre de la marca
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                maxLength={MAX_BRAND}
                autoComplete="off"
                placeholder="Ej.: Café del Cerro"
                onChange={(e) => setBrand(sanitizeBrand(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3.5 font-display text-2xl text-crema placeholder:text-arena/35 focus:border-arena focus:outline-none focus:ring-2 focus:ring-arena/40"
              />
              <p className="mt-2 flex justify-between text-xs text-arena/50">
                <span>Aparece en la etiqueta inferior; el tamaño se ajusta solo.</span>
                <span className="tabular-nums">
                  {brand.length}/{MAX_BRAND}
                </span>
              </p>
            </StepBlock>

            <StepBlock n={2} title="Elige tu bolsa">
              <Segmented
                dark
                legend="Color"
                value={bag}
                onChange={setBag}
                options={[
                  { value: 'negra', label: 'Negra', icon: <BagIcon tone="negra" tall /> },
                  { value: 'blanca', label: 'Blanca', icon: <BagIcon tone="blanca" tall /> },
                ]}
              />
            </StepBlock>

            <StepBlock n={3} title="Formato">
              <Segmented
                dark
                legend="Tamaño de la bolsa"
                value={format}
                onChange={setFormat}
                options={[
                  { value: '250', label: '250 g', icon: <BagIcon tone="none" /> },
                  { value: '1000', label: '1 kg', icon: <BagIcon tone="none" tall /> },
                ]}
              />
            </StepBlock>

            <StepBlock n={4} title="Carga tu logo">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-5"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                  onChange={onInputChange}
                  className="sr-only"
                  id="logo-file"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn-light">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M8 11V3m0 0L4.5 6.5M8 3l3.5 3.5M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {upload.original ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  <button type="button" onClick={skipLogo} className={`btn-ghost-dark ${logoMode === 'skip' ? 'ring-1 ring-arena' : ''}`} aria-pressed={logoMode === 'skip'}>
                    Omitir / no tengo logo
                  </button>
                </div>
                <p className="mt-3 text-xs text-arena/55">PNG, JPG o SVG · máximo {MAX_FILE_MB} MB · también puedes soltar el archivo aquí.</p>

                {upload.status === 'error' && (
                  <p role="alert" className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-[13px] text-red-100">
                    {upload.error}
                  </p>
                )}
                {upload.status === 'loading' && <p className="mt-4 text-[13px] text-arena/70">Leyendo archivo…</p>}

                {upload.original && logoMode === 'upload' && (
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <figure>
                        <Checker className="h-28">
                          <CanvasThumb source={upload.originalTrim} label="Logo original" />
                        </Checker>
                        <figcaption className="mt-1.5 text-xs text-arena/60">Original</figcaption>
                      </figure>
                      <figure>
                        <Checker className="relative h-28">
                          {upload.alreadyTransparent ? (
                            <CanvasThumb source={upload.originalTrim} label="Logo con fondo transparente" />
                          ) : upload.processed ? (
                            <CanvasThumb source={upload.processed} label="Logo sin fondo" />
                          ) : (
                            <span className="text-xs text-grano/60">Sin resultado</span>
                          )}
                          {upload.status === 'processing' && (
                            <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs text-crema">Quitando fondo…</span>
                          )}
                        </Checker>
                        <figcaption className="mt-1.5 text-xs text-arena/60">{upload.alreadyTransparent ? 'Ya es transparente' : 'Sin fondo'}</figcaption>
                      </figure>
                    </div>

                    {upload.alreadyTransparent ? (
                      <p className="text-[13px] text-arena/70">Tu logo ya tiene fondo transparente, así que se usa tal cual.</p>
                    ) : (
                      <div className="space-y-4 rounded-xl bg-white/[0.04] p-4">
                        <Segmented
                          dark
                          legend="Logo a usar"
                          value={upload.useProcessed ? 'sin' : 'orig'}
                          onChange={(v) => setUpload((u) => ({ ...u, useProcessed: v === 'sin' }))}
                          options={[
                            { value: 'sin', label: 'Sin fondo' },
                            { value: 'orig', label: 'Original' },
                          ]}
                        />
                        {upload.useProcessed && (
                          <>
                            <Slider
                              label="Tolerancia del fondo"
                              value={upload.tolerance}
                              min={0}
                              max={100}
                              onChange={(v) => setUpload((u) => ({ ...u, tolerance: v }))}
                              format={(v) => (v < 20 ? 'Precisa' : v > 60 ? 'Amplia' : 'Media')}
                            />
                            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-arena/80">
                              <input
                                type="checkbox"
                                className="check mt-0.5"
                                checked={upload.interior}
                                onChange={(e) => setUpload((u) => ({ ...u, interior: e.target.checked }))}
                              />
                              <span>Quitar también el fondo dentro del logo (espacios de letras como la «o» o la «a»)</span>
                            </label>
                            <p className="text-xs leading-relaxed text-arena/50">
                              Si se borran partes del logo, baja la tolerancia. Si quedan restos del fondo, súbela.
                              {upload.uniformity < 0.55 && ' El fondo de tu imagen no es uniforme; si el resultado no convence, usa el original.'}
                            </p>
                            {upload.error && upload.status === 'done' && (
                              <p role="alert" className="text-[13px] text-amber-200">
                                {upload.error}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {logoMode === 'skip' && (
                  <div className="mt-5 rounded-xl bg-white/[0.04] p-4">
                    <p className="text-[13px] text-arena/80">Sin logo, la bolsa muestra solo la etiqueta con tu nombre y gramaje.</p>
                    <button type="button" onClick={() => setLogoMode('typo')} className="btn-light mt-3">
                      Crear un logotipo con mi nombre
                    </button>
                  </div>
                )}

                {logoMode === 'typo' && (
                  <div className="mt-5 space-y-3 rounded-xl bg-white/[0.04] p-4">
                    <Segmented
                      dark
                      legend="Estilo del logotipo tipográfico"
                      value={typoStyle}
                      onChange={setTypoStyle}
                      options={[
                        { value: 'clasico', label: 'Clásico' },
                        { value: 'monograma', label: 'Monograma' },
                      ]}
                    />
                    {!brand.trim() && <p className="text-xs text-amber-200/90">Escribe el nombre de tu marca en el paso 1 para personalizarlo.</p>}
                    <button type="button" onClick={skipLogo} className="text-[13px] text-arena/70 underline underline-offset-4 hover:text-crema">
                      Quitar logotipo
                    </button>
                  </div>
                )}
              </div>
            </StepBlock>

            {hasLogo && (
              <div className="space-y-5 rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-medium text-crema">Ajustar logo</h3>
                <Slider label="Tamaño" value={controls.scale} min={50} max={160} onChange={(v) => setControls((c) => ({ ...c, scale: v }))} format={(v) => `${v}%`} />
                <Slider label="Posición horizontal" value={controls.x} min={-100} max={100} onChange={(v) => setControls((c) => ({ ...c, x: v }))} format={(v) => (v === 0 ? 'Centrado' : v < 0 ? 'Izquierda' : 'Derecha')} />
                <Slider label="Posición vertical" value={controls.y} min={-100} max={100} onChange={(v) => setControls((c) => ({ ...c, y: v }))} format={(v) => (v === 0 ? 'Por defecto' : v < 0 ? 'Más arriba' : 'Más abajo')} />
                {logoMode === 'upload' && (
                  <Segmented
                    dark
                    legend="Color del logo"
                    value={logoColor}
                    onChange={setLogoColor}
                    options={[
                      { value: 'original', label: 'Colores originales' },
                      { value: 'mono', label: bag === 'negra' ? 'Monocromo blanco' : 'Monocromo negro' },
                    ]}
                  />
                )}
                {contrastHint && <p className="text-xs text-amber-200/90">{contrastHint}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-arena/50">El logo nunca invade la etiqueta ni se deforma.</p>
                  <button type="button" onClick={() => setControls(DEFAULT_CONTROLS)} className="text-[13px] text-arena/75 underline underline-offset-4 hover:text-crema">
                    Centrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}

function StepBlock({ n, title, children }) {
  return (
    <div>
      <h3 className="mb-4 flex items-baseline gap-3">
        <span className="font-display text-xl text-arena/50">{n}</span>
        <span className="text-lg font-medium text-crema">{title}</span>
      </h3>
      {children}
    </div>
  );
}
