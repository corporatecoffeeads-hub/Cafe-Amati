import { useMemo, useState } from 'react';
import { CLASSICS, FLAVORED, ATTRIBUTES, FLAVORED_TAGLINE } from '../data/catalog.js';
import { LevelMeter, Price, Segmented } from './ui.jsx';

/**
 * Coincidencia: distancia absoluta por atributo (niveles 1–3).
 * Compatibilidad = 1 − distancia / distancia máxima (6). Empates se muestran juntos.
 */
export function recommendClassic(prefs) {
  const scored = CLASSICS.map((p) => {
    const diffs = ATTRIBUTES.map((a) => ({ attr: a, want: prefs[a.key], has: p.attrs[a.key], d: p.attrs[a.key] - prefs[a.key] }));
    const dist = diffs.reduce((s, x) => s + Math.abs(x.d), 0);
    return { product: p, diffs, dist, match: Math.round((1 - dist / 6) * 100) };
  });
  const best = Math.min(...scored.map((s) => s.dist));
  return { winners: scored.filter((s) => s.dist === best), exact: best === 0 };
}

function explain(diffs) {
  const same = diffs.filter((x) => x.d === 0).map((x) => x.attr.label.toLowerCase());
  const other = diffs
    .filter((x) => x.d !== 0)
    .map((x) => `${x.attr.label.toLowerCase()} ${x.attr.levels[x.has - 1].toLowerCase()} (${Math.abs(x.d) === 1 ? 'un nivel' : 'dos niveles'} ${x.d > 0 ? 'más' : 'menos'} de lo que buscas)`);
  const join = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`);
  const parts = [];
  if (same.length === 3) return 'Coincide exactamente en intensidad, tueste y acidez.';
  if (same.length) parts.push(`Coincide en ${join(same)}`);
  if (other.length) parts.push(`${same.length ? 'y tiene' : 'Tiene'} ${join(other)}`);
  return parts.join(' ') + '.';
}

function ResultCard({ product, children, match }) {
  return (
    <article className="result-in grid gap-6 rounded-[22px] bg-crema p-6 shadow-[0_24px_60px_-35px_rgba(43,23,15,0.55)] sm:grid-cols-[150px_1fr] sm:p-8">
      <div className="shelf flex h-52 items-end justify-center rounded-2xl sm:h-full">
        <img src={product.image} alt={`Bolsa de café Amati ${product.name}`} className="mb-4 h-40 w-auto object-contain drop-shadow-[0_12px_14px_rgba(43,23,15,0.3)]" />
      </div>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-display text-4xl font-medium leading-none text-grano">{product.name}</h4>
          {match != null && <span className="rounded-full bg-espresso px-3 py-1 text-xs text-crema">{match}% compatible</span>}
        </div>
        <div className="mt-4">{children}</div>
        <div className="mt-6 border-t border-grano/10 pt-5">
          <Price amount={product.price} />
        </div>
      </div>
    </article>
  );
}

export default function Finder() {
  const [pref, setPref] = useState('clasico');
  const [prefs, setPrefs] = useState({ intensidad: 2, tueste: 2, acidez: 2 });
  const [flavor, setFlavor] = useState(FLAVORED[0].id);

  const result = useMemo(() => recommendClassic(prefs), [prefs]);
  const flavored = FLAVORED.find((f) => f.id === flavor);

  return (
    <section id="tu-cafe" className="scroll-mt-16 bg-tostado/60" aria-labelledby="finder-title">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 id="finder-title" className="font-display text-[2.6rem] font-medium leading-[1.02] text-grano sm:text-6xl">
            Encuentra tu café ideal
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-grano/70">Cuéntanos cómo te gusta y te decimos qué variedad del catálogo se acerca más.</p>
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
                  options={a.levels.map((l, i) => ({ value: String(i + 1), label: l }))}
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
            <p className="mb-4 text-sm text-grano/65">
              {pref === 'clasico'
                ? result.winners.length > 1
                  ? `Hay ${result.winners.length} variedades igual de compatibles:`
                  : result.exact
                    ? 'Tu café ideal:'
                    : 'Ninguna variedad tiene exactamente esa combinación. La más cercana es:'
                : 'Tu aromatizado:'}
            </p>
            <div className="space-y-5">
              {pref === 'clasico' ? (
                result.winners.map((w) => (
                  <ResultCard key={w.product.id} product={w.product} match={w.match}>
                    <p className="text-[15px] leading-relaxed text-grano/75">{explain(w.diffs)}</p>
                    <div className="mt-4 max-w-xs space-y-2">
                      {ATTRIBUTES.map((a) => (
                        <LevelMeter key={a.key} label={a.label} level={w.product.attrs[a.key]} levelName={a.levels[w.product.attrs[a.key] - 1]} />
                      ))}
                    </div>
                  </ResultCard>
                ))
              ) : (
                <ResultCard key={flavored.id} product={flavored}>
                  <p className="text-[15px] leading-relaxed text-grano/75">
                    Aroma {flavored.flavor.toLowerCase()}. {FLAVORED_TAGLINE}
                  </p>
                </ResultCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
