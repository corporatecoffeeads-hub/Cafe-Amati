import { useId } from 'react';

/** Grano de café: relleno (nivel activo) o contorno, como en el PDF. */
export function Bean({ filled, size = 16, className = '' }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 18 25" aria-hidden="true" className={className}>
      <ellipse cx="9" cy="12.5" rx="7.6" ry="11.3" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M9.6 1.6c-3.4 3.6-3.6 6.8-1.2 10.6 2.3 3.7 2.1 7.2-1.4 11.1"
        fill="none"
        stroke={filled ? 'var(--bean-line, #F2DCC6)' : 'currentColor'}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={filled ? 0.55 : 1}
      />
    </svg>
  );
}

export function LevelMeter({ label, level, levelName, dark = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[13px] ${dark ? 'text-arena/80' : 'text-grano/70'}`}>{label}</span>
      <span className="flex items-center gap-[3px]" role="img" aria-label={`${label}: nivel ${level} de 3${levelName ? ` (${levelName})` : ''}`}>
        {[1, 2, 3].map((n) => (
          <Bean key={n} filled={n <= level} size={17} className={dark ? 'text-arena' : 'text-espresso'} />
        ))}
      </span>
    </div>
  );
}

/** Grupo de opciones accesible (radios nativos → navegación con flechas). */
export function Segmented({ legend, name, options, value, onChange, dark = false, hint, columns }) {
  const id = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={`mb-2.5 text-sm font-medium ${dark ? 'text-crema' : 'text-grano'}`}>{legend}</legend>
      {hint && <p className={`-mt-1 mb-2.5 text-xs ${dark ? 'text-arena/60' : 'text-grano/60'}`}>{hint}</p>}
      <div
        className={`grid gap-1.5 rounded-[14px] p-1.5 ${dark ? 'bg-white/[0.06]' : 'bg-grano/[0.06]'}`}
        style={{ gridTemplateColumns: `repeat(${columns || options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const checked = value === o.value;
          const oid = `${id}-${o.value}`;
          return (
            <div key={o.value} className="relative">
              <input
                type="radio"
                id={oid}
                name={name || id}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={oid}
                className={`flex h-full cursor-pointer select-none items-center justify-center gap-2 rounded-[10px] px-2 py-2.5 text-center text-[13px] transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
                  dark
                    ? checked
                      ? 'bg-arena text-grano peer-focus-visible:outline-arena'
                      : 'text-arena/80 hover:bg-white/[0.07] peer-focus-visible:outline-arena'
                    : checked
                      ? 'bg-espresso text-crema peer-focus-visible:outline-espresso'
                      : 'text-grano/75 hover:bg-grano/[0.07] peer-focus-visible:outline-espresso'
                }`}
              >
                {o.icon}
                <span>{o.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format, dark = true }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className={`text-[13px] ${dark ? 'text-arena/85' : 'text-grano/80'}`}>
          {label}
        </label>
        <output htmlFor={id} className={`text-xs tabular-nums ${dark ? 'text-arena/60' : 'text-grano/60'}`}>
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
      />
    </div>
  );
}

export function Price({ amount, dark = false }) {
  return (
    <p className={dark ? 'text-crema' : 'text-grano'}>
      <span className="font-display text-[2.1rem] font-medium leading-none">{'$' + amount.toLocaleString('es-CL')}</span>
      <span className={`ml-2 text-sm ${dark ? 'text-arena/70' : 'text-grano/60'}`}>+ IVA por bolsa de 1 kg</span>
    </p>
  );
}
