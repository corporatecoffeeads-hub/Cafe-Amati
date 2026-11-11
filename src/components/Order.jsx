import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CLASSICS, FLAVORED, CONDITIONS } from '../data/catalog.js';
import { waLink } from '../data/site.js';
import { track } from '../analytics.js';

/* ---------- datos y lógica (sin precios) ---------- */

export const ORDER_VARIETIES = [
  ...CLASSICS.map((p) => ({ id: p.id, label: p.name, image: p.image })),
  ...FLAVORED.map((p) => ({ id: p.id, label: `Aromatizado ${p.name}`, image: p.image })),
];
export const ORDER_FORMATS = [
  { value: '250', label: '250 g', kg: 0.25 },
  { value: '1000', label: '1 kg', kg: 1 },
];
export const ORDER_PRESENTATIONS = [
  { value: 'grano', label: 'Grano entero' },
  { value: 'molido', label: 'Molido' },
];
const MIN_KG = CONDITIONS.minKg;
const MAX_QTY = 9999;

const byId = (list, key, v) => list.find((x) => x[key] === v);

export function lineKg(item) {
  const f = byId(ORDER_FORMATS, 'value', item.format);
  const q = parseInt(item.qty, 10);
  return f && q > 0 ? f.kg * q : 0;
}

export function formatKg(kg) {
  const r = Math.round(kg * 100) / 100;
  return r.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

export function isComplete(item) {
  const q = parseInt(item.qty, 10);
  return !!item.variety && !!item.format && !!item.presentation && Number.isInteger(q) && q > 0;
}

export function buildMessage(items) {
  const lines = items.map((it, i) => {
    const v = byId(ORDER_VARIETIES, 'id', it.variety).label;
    const f = byId(ORDER_FORMATS, 'value', it.format).label;
    const p = byId(ORDER_PRESENTATIONS, 'value', it.presentation).label;
    const q = parseInt(it.qty, 10);
    return `${i + 1}. ${v} | ${f} | ${p} | ${q} ${q === 1 ? 'unidad' : 'unidades'} | ${formatKg(lineKg(it))} kg`;
  });
  const total = items.reduce((s, it) => s + lineKg(it), 0);
  return [
    'Hola, quiero solicitar una cotización mayorista de Café Amati:',
    '',
    ...lines,
    '',
    `TOTAL SOLICITADO: ${formatKg(total)} KG`,
    'Quedo atento a la cotización. ¡Gracias!',
  ].join('\n');
}

let uid = 0;
const newItem = () => ({ key: ++uid, variety: '', format: '1000', presentation: 'grano', qty: '1' });

/* ---------- apertura desde cualquier botón ---------- */

const OPEN_EVENT = 'amati:abrir-pedido';
export function openOrder(source) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { source } }));
}

export function OrderButton({ source, tone = 'light', className = '' }) {
  return (
    <button type="button" onClick={() => openOrder(source)} className={`order-cta ${tone === 'dark' ? 'order-cta-dark' : 'order-cta-light'} ${className}`} aria-haspopup="dialog">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M5 8h14l-1.3 10.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5 8z" strokeLinejoin="round" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
      </svg>
      Quiero hacer mi pedido
    </button>
  );
}

/* ---------- controles ---------- */

function Choice({ legend, options, value, onChange }) {
  const id = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-grano/70">{legend}</legend>
      <div className="grid gap-1 rounded-xl bg-grano/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <div key={o.value} className="relative">
            <input type="radio" id={`${id}-${o.value}`} name={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <label
              htmlFor={`${id}-${o.value}`}
              className={`flex h-full cursor-pointer select-none items-center justify-center rounded-lg px-2 py-2 text-center text-[13px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-espresso ${
                value === o.value ? 'bg-espresso text-crema' : 'text-grano/75 hover:bg-grano/[0.07]'
              }`}
            >
              {o.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function QtyInput({ id, value, onChange, invalid }) {
  const q = parseInt(value, 10) || 0;
  const set = (n) => onChange(String(Math.min(MAX_QTY, Math.max(1, n))));
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-grano/70">
        Cantidad (bolsas)
      </label>
      <div className={`flex items-stretch overflow-hidden rounded-xl border bg-white/80 ${invalid ? 'border-red-700/60' : 'border-grano/15'}`}>
        <button type="button" onClick={() => set(q - 1)} disabled={q <= 1} className="w-11 shrink-0 text-xl text-grano/70 transition hover:bg-grano/[0.06] disabled:opacity-30" aria-label="Restar una bolsa">
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 4))}
          onBlur={() => !value && onChange('1')}
          aria-invalid={invalid ? 'true' : 'false'}
          className="w-full min-w-0 bg-transparent py-2.5 text-center text-[15px] tabular-nums text-grano focus:outline-none"
        />
        <button type="button" onClick={() => set(q + 1)} className="w-11 shrink-0 text-xl text-grano/70 transition hover:bg-grano/[0.06]" aria-label="Sumar una bolsa">
          +
        </button>
      </div>
    </div>
  );
}

function ItemRow({ item, index, onChange, onRemove, canRemove, showErrors }) {
  const id = useId();
  const v = byId(ORDER_VARIETIES, 'id', item.variety);
  const missingVariety = showErrors && !item.variety;
  return (
    <li className="order-row rounded-2xl border border-grano/10 bg-crema p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-arena/70">
          {v ? <img src={v.image} alt="" className="h-14 w-auto object-contain" /> : <span className="font-display text-xl text-grano/40">{index + 1}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-v`} className="mb-1.5 block text-xs font-medium text-grano/70">
            Producto {index + 1}: variedad
          </label>
          <select
            id={`${id}-v`}
            value={item.variety}
            onChange={(e) => onChange({ variety: e.target.value })}
            aria-invalid={missingVariety ? 'true' : 'false'}
            className="field py-2.5"
          >
            <option value="">Elige una variedad</option>
            <optgroup label="Clásicos">
              {ORDER_VARIETIES.slice(0, CLASSICS.length).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Aromatizados">
              {ORDER_VARIETIES.slice(CLASSICS.length).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
          {missingVariety && <p className="mt-1 text-[12px] text-red-800">Elige una variedad para este producto.</p>}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-6 grid h-10 w-10 shrink-0 place-items-center rounded-full text-grano/55 transition hover:bg-red-700/10 hover:text-red-800"
            aria-label={`Eliminar producto ${index + 1}${v ? ` (${v.label})` : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.35fr_1fr]">
        <Choice legend="Formato" options={ORDER_FORMATS} value={item.format} onChange={(format) => onChange({ format })} />
        <Choice legend="Presentación" options={ORDER_PRESENTATIONS} value={item.presentation} onChange={(presentation) => onChange({ presentation })} />
        <QtyInput id={`${id}-q`} value={item.qty} onChange={(qty) => onChange({ qty })} invalid={showErrors && !(parseInt(item.qty, 10) > 0)} />
      </div>
      <p className="mt-3 text-right text-[13px] text-grano/60">
        Subtotal: <span className="font-medium text-grano">{formatKg(lineKg(item))} kg</span>
      </p>
    </li>
  );
}

/* ---------- diálogo ---------- */

export default function OrderDialog() {
  const ref = useRef(null);
  const listRef = useRef(null);
  const [items, setItems] = useState(() => [newItem()]);
  const [showErrors, setShowErrors] = useState(false);
  const [announce, setAnnounce] = useState('');

  const open = useCallback((source) => {
    const d = ref.current;
    if (!d || d.open) return;
    d.showModal();
    document.documentElement.classList.add('modal-open');
    track('abrir_pedido', { ubicacion: source || 'otro' });
  }, []);
  const close = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    const onOpen = (e) => open(e.detail?.source);
    window.addEventListener(OPEN_EVENT, onOpen);
    const d = ref.current;
    const onClose = () => document.documentElement.classList.remove('modal-open');
    d?.addEventListener('close', onClose);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      d?.removeEventListener('close', onClose);
    };
  }, [open]);

  const total = useMemo(() => items.reduce((s, it) => s + lineKg(it), 0), [items]);
  const complete = items.filter(isComplete);
  const allComplete = complete.length === items.length;
  const missing = Math.max(0, MIN_KG - total);
  const canSend = allComplete && total >= MIN_KG;
  const progress = Math.min(100, (total / MIN_KG) * 100);
  const href = canSend ? waLink(buildMessage(items)) : undefined;

  const update = (key, patch) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const remove = (key, label) => {
    setItems((list) => list.filter((it) => it.key !== key));
    setAnnounce(`${label} eliminado del pedido.`);
  };
  const add = () => {
    setItems((list) => [...list, newItem()]);
    setAnnounce('Producto agregado. Elige la variedad.');
    requestAnimationFrame(() => {
      const rows = listRef.current?.querySelectorAll('.order-row select');
      rows?.[rows.length - 1]?.focus();
    });
  };

  const reason = !allComplete
    ? 'Completa la variedad y la cantidad de cada producto.'
    : missing > 0
      ? `Faltan ${formatKg(missing)} kg para el pedido mínimo de ${MIN_KG} kg.`
      : '¡Listo! Tu pedido cumple el mínimo.';

  return (
    <dialog
      ref={ref}
      className="order-dialog"
      aria-labelledby="order-title"
      data-wa="pedido"
      onClick={(e) => e.target === ref.current && close()}
    >
      <div className="flex flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-grano/10 px-5 pb-4 pt-5 sm:px-7">
          <div>
            <h2 id="order-title" className="font-display text-3xl font-medium leading-none text-grano sm:text-4xl">
              Tu pedido
            </h2>
            <p className="mt-2 text-[13px] text-grano/65">Arma tu solicitud y te enviamos la cotización por WhatsApp. Pedido mínimo {MIN_KG} kg en total.</p>
          </div>
          <button type="button" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-grano/70 hover:bg-grano/[0.07]" aria-label="Cerrar pedido">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 5l12 12M17 5L5 17" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <ol ref={listRef} className="space-y-4">
            {items.map((it, i) => (
              <ItemRow
                key={it.key}
                item={it}
                index={i}
                canRemove={items.length > 1}
                showErrors={showErrors}
                onChange={(patch) => update(it.key, patch)}
                onRemove={() => remove(it.key, byId(ORDER_VARIETIES, 'id', it.variety)?.label || `Producto ${i + 1}`)}
              />
            ))}
          </ol>
          <button type="button" onClick={add} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-grano/30 py-3.5 text-sm font-medium text-grano transition hover:border-grano/60 hover:bg-grano/[0.03]">
            <span className="text-lg leading-none">+</span> Agregar otro producto
          </button>

          {complete.length > 0 && (
            <section className="mt-6" aria-label="Resumen del pedido">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-grano/55">Resumen</h3>
              <ul className="mt-2 divide-y divide-grano/10 rounded-2xl bg-arena/45 px-4">
                {complete.map((it) => {
                  const q = parseInt(it.qty, 10);
                  return (
                    <li key={it.key} className="flex items-baseline justify-between gap-3 py-2.5 text-[13px] text-grano/80">
                      <span className="min-w-0">
                        <span className="font-medium text-grano">{byId(ORDER_VARIETIES, 'id', it.variety).label}</span> · {byId(ORDER_FORMATS, 'value', it.format).label} ·{' '}
                        {byId(ORDER_PRESENTATIONS, 'value', it.presentation).label} · {q} {q === 1 ? 'unidad' : 'unidades'}
                      </span>
                      <span className="shrink-0 tabular-nums text-grano">{formatKg(lineKg(it))} kg</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <footer className="border-t border-grano/10 bg-crema px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-grano/60">Total solicitado</p>
              <p className="font-display text-[2.6rem] font-medium leading-none text-grano" style={{ fontVariantNumeric: 'lining-nums tabular-nums' }} aria-live="polite">
                {formatKg(total)} <span className="text-2xl">kg</span>
              </p>
            </div>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer" className="order-send" onClick={() => track('enviar_pedido', { total_kg: total, productos: items.length })}>
                Enviar solicitud
              </a>
            ) : (
              <button
                type="button"
                className="order-send"
                aria-disabled="true"
                onClick={() => {
                  setShowErrors(true);
                  setAnnounce(reason);
                }}
              >
                Enviar solicitud
              </button>
            )}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-grano/10" role="progressbar" aria-label="Avance hacia el pedido mínimo" aria-valuemin={0} aria-valuemax={MIN_KG} aria-valuenow={Math.min(total, MIN_KG)}>
            <div className={`h-full rounded-full transition-[width] duration-300 ${total >= MIN_KG ? 'bg-[#3E7D4E]' : 'bg-espresso'}`} style={{ width: `${progress}%` }} />
          </div>
          <p className={`mt-2 text-[13px] ${canSend ? 'text-[#2F6A3E]' : 'text-grano/70'}`}>{reason}</p>
        </footer>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </dialog>
  );
}
