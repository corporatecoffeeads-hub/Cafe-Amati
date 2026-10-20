import { useMemo, useState } from 'react';
import { CLASSICS, FLAVORED, ATTRIBUTES, FLAVORED_TAGLINE } from '../data/catalog.js';
import { LevelMeter, Segmented, Price } from './ui.jsx';

// Niveles que el cliente puede elegir (solo los que existen en el catálogo).
const SELECTABLE = { intensidad: [2, 3], tueste: [2, 3], acidez: [1, 2, 3] };
const THRESHOLD = 70; // % mínimo para mostrar una variedad como cercana

/**
 * Coincidencia: distancia absoluta por atributo (niveles 1–3).
 * Compatibilidad = 1 − distancia / distancia máxima (6).
 */
export function recommendClassic(prefs) {
  const scored = CLASSICS.map((p) => {
    const diffs = ATTRIBUTES.map((a) => ({ attr: a, want: prefs[a.key], has: p.attrs[a.key], d: p.attrs[a.key] - prefs[a.key] }));
    const dist = diffs.reduce((s, x) => s + Math.abs(x.d), 0);
    return { product: p, diffs, dist, match: Math.round((1 - dist / 6) * 100) };
  }).sort((a, b) => b.match - a.match);
  const exact = scored.filter((s) => s.match === 100);
  let close = scored.filter((s) => s.match >= THRESHOLD && s.match < 100);
  let fallback = false;
  if (!exact.length && !close.length) {
    // ninguna supera el umbral: muestra las más cercanas
    const best = scored[0].match;
    close = scored.filter((s) => s.match === best);
    fallback = true;
  }
  return { exact, close, fallback };
}

function explain(diffs) {
  const same = diffs.filter((x) => x.d === 0).map((x) => x.attr.label.toLowerCase());
  const other = diffs
    .filter((x) => x.d !== 0)
    .map((x) => `${x.attr.label.toLowerCase()} ${x.attr.levels[x.has - 1].toLowerCase()} (${Math.abs(x.d) === 1 ? 'un nivel' : 'dos niveles'} ${x.d > 0 ? 'más' : 'menos'} de lo que buscas)`);
  const join = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`);
  if (same.length === 3) return 'Coincide exactamente en intensidad, tueste y acidez.';
  const parts = [];
  if (same.length) parts.push(`Coincide en ${join(same)}`);
  if (other.length) parts.push(`${same.length ? 'y tiene' : 'Tiene'} ${join(other)}`);
  return parts.join(' ') + '.';
}

function ResultCard({ product, match, ideal, children }) {
  return (
    <article
      className={`result-in grid gap-6 rounded-[22px] bg-crema p-6 sm:grid-cols-[150px_1fr] sm:p-8 ${
        ideal ? 'ideal-glow ring-1 ring-[#C9A27A]' : 'shadow-[0_24px_60px_-35px_rgba(43,23,15,0.55)]'
      }`}
    >
      <div className="shelf flex h-52 items-end justify-center rounded-2xl sm:h-full">
        <img src={product.image} alt={`Bolsa de café Amati ${product.name}`} className="mb-4 h-40 w-auto object-contain drop-shadow-[0_12px_14px_rgba(43,23,15,0.3)]" />
      </div>
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {ideal && <p className="mb-1.5 text-xs font-medium text-espresso">Coincidencia exacta</p>}
            <h4 className="font-display text-4xl font-medium leading-none text-grano">{product.name}</h4>
          </div>
          {match != null && (
            <div className={`rounded-2xl px-4 py-2 text-center ${ideal ? 'bg-espresso text-crema' : 'bg-arena text-grano'}`}>
              <span className="block font-display text-3xl font-medium leading-none tabular-nums">{match}%</span>
              <span className={`mt-0.5 block text-[11px] ${ideal ? 'text-arena/85' : 'text-grano/65'}`}>compatible</span>
            </div>
          )}
        </div>
        <div className="mt-4">{children}</div>
        {product.price != null && (
          <div className="mt-6 border-t border-grano/10 pt-5">
            <Price amount={product.price} />
          </div>
        )}
      </div>
    </article>
  );
}

function ClassicResult({ r, ideal }) {
  return (
    <ResultCard product={r.product} match={r.match} ideal={ideal}>
      <p className="text-[15px] leading-relaxed text-grano/75">{explain(r.diffs)} 100% Arábica.</p>
      <div className="mt-4 max-w-xs space-y-2">
        {ATTRIBUTES.map((a) => (
          <LevelMeter key={a.key} label={a.label} level={r.product.attrs[a.key]} levelName={a.levels[r.product.attrs[a.key] - 1]} />
        ))}
      </div>
    </ResultCard>
  );
}

export default function Finder() {
  const [pref, setPref] = useState('clasico');
  const [prefs, setPrefs] = useState({ intensidad: 2, tueste: 2, acidez: 2 });
  const [flavor, setFlavor] = useState(FLAVORED[0].id);

  const result = useMemo(() => recommendClassic(prefs), [prefs]);
  const flavored = FLAVORED.find((f) => f.id === flavor);
  const key = `${prefs.intensidad}${prefs.tueste}${prefs.acidez}`;

  return (
    <section id="tu-cafe" className="scroll-mt-16 bg-tostado/60" aria-labelledby="finder-title">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 id="finder-title" className="font-display text-[2.6rem] font-medium leading-[1.02] text-grano sm:text-6xl">
            Encuentra tu café ideal
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-grano/70">Cuéntanos cómo te gusta y te mostramos las variedades del catálogo que más se acercan.</p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <form className="space-y-7" onSubmit={(e) => e.preventDefault()} aria-label="Preferencias de café">
            <Segmented
              legend="Prefiero un café"
              value={pref}
              onChange={setPref}
              options={[
                { value: 'clasico', label: 'Clásico' },
                { value: 'aromatizado', label: 'Aromatizado' },
              ]}
            />
            {pref === 'clasico' ? (
              ATTRIBUTES.map((a) => (
                <Segmented
                  key={a.key}
                  legend={a.label}
                  value={String(prefs[a.key])}
                  onChange={(v) => setPrefs((p) => ({ ...p, [a.key]: Number(v) }))}
                  options={SELECTABLE[a.key].map((lvl) => ({ value: String(lvl), label: a.levels[lvl - 1] }))}
                />
              ))
            ) : (
              <Segmented
                legend="Sabor preferido"
                value={flavor}
                onChange={setFlavor}
                columns={3}
                options={FLAVORED.map((f) => ({
                  value: f.id,
                  label: f.flavor,
                  icon: <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.accent }} aria-hidden="true" />,
                }))}
              />
            )}
          </form>

          <div aria-live="polite">
            {pref === 'clasico' ? (
              <div className="space-y-8">
                {result.exact.length > 0 && (
                  <div>
                    <h3 className="mb-4 font-display text-2xl font-medium text-grano">Tu café ideal</h3>
                    <div className="space-y-5">
                      {result.exact.map((r) => (
                        <ClassicResult key={r.product.id + key} r={r} ideal />
                      ))}
                    </div>
                  </div>
                )}
                {result.close.length > 0 && (
                  <div>
                    <h3 className="font-display text-2xl font-medium text-grano">Cercanas a tus preferencias</h3>
                    <p className="mb-4 mt-1 text-sm text-grano/65">
                      {result.fallback
                        ? 'Ninguna variedad supera el 70% de compatibilidad con esa combinación. Estas son las más cercanas.'
                        : 'No son exactamente lo que buscas, pero se parecen bastante.'}
                    </p>
                    <div className="space-y-5">
                      {result.close.map((r) => (
                        <ClassicResult key={r.product.id + key} r={r} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="mb-4 font-display text-2xl font-medium text-grano">Tu aromatizado</h3>
                <ResultCard key={flavored.id} product={flavored}>
                  <p className="text-[15px] leading-relaxed text-grano/75">
                    Aroma {flavored.flavor.toLowerCase()}. {FLAVORED_TAGLINE}
                  </p>
                </ResultCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
