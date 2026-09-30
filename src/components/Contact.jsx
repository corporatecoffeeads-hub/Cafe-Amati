import { useState } from 'react';
import { CONTACT, REGIONS, waLink } from '../data/site.js';
import { CONDITIONS } from '../data/catalog.js';

const EMPTY = { nombre: '', empresa: '', telefono: '', correo: '', region: '', kg: '', mensaje: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v) {
  const e = {};
  if (v.nombre.trim().length < 2) e.nombre = 'Escribe tu nombre.';
  const digits = v.telefono.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 12) e.telefono = 'Escribe un teléfono válido, por ejemplo +56 9 1234 5678.';
  if (!EMAIL_RE.test(v.correo.trim())) e.correo = 'Escribe un correo válido.';
  if (!v.region) e.region = 'Elige tu región.';
  const kg = Number(v.kg);
  if (!v.kg || !Number.isFinite(kg) || !Number.isInteger(kg)) e.kg = 'Indica los kilos en números enteros.';
  else if (kg < CONDITIONS.minKg) e.kg = `La compra mínima es de ${CONDITIONS.minKg} kg.`;
  else if (kg > 100000) e.kg = 'Revisa la cantidad ingresada.';
  return e;
}

function summary(v) {
  return [
    `Nombre: ${v.nombre.trim()}`,
    v.empresa.trim() && `Empresa: ${v.empresa.trim()}`,
    `Teléfono: ${v.telefono.trim()}`,
    `Correo: ${v.correo.trim()}`,
    `Región: ${v.region}`,
    `Volumen estimado: ${v.kg} kg`,
    v.mensaje.trim() && `Mensaje: ${v.mensaje.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function ChatIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 19.5l1.3-3.9A8 8 0 1 1 8.4 18.7L4 19.5z" strokeLinejoin="round" />
      <path d="M9 10.5h6M9 13.5h4" strokeLinecap="round" />
    </svg>
  );
}

function Field({ id, label, error, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-grano">
        {label} {optional && <span className="font-normal text-grano/50">(opcional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Contact() {
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: 'idle', text: '' });

  const set = (k) => (e) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const check = () => {
    const e = validate(v);
    setErrors(e);
    if (Object.keys(e).length) {
      setStatus({ type: 'error', text: 'Revisa los campos marcados.' });
      document.getElementById(Object.keys(e)[0])?.focus();
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!check()) return;
    const subject = `Cotización mayorista: ${v.nombre.trim()}${v.empresa.trim() ? ` (${v.empresa.trim()})` : ''} · ${v.kg} kg`;
    if (CONTACT.formEndpoint) {
      setStatus({ type: 'sending', text: 'Enviando…' });
      try {
        const res = await fetch(CONTACT.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: subject,
            _template: 'table',
            _captcha: 'false',
            nombre: v.nombre.trim(),
            empresa: v.empresa.trim(),
            telefono: v.telefono.trim(),
            email: v.correo.trim(),
            region: v.region,
            volumen_kg: v.kg,
            mensaje: v.mensaje.trim(),
          }),
        });
        if (!res.ok) throw new Error();
        setV(EMPTY);
        setStatus({ type: 'ok', text: 'Solicitud enviada. Te contactaremos a la brevedad.' });
      } catch {
        setStatus({ type: 'error', text: 'No se pudo enviar. Inténtalo de nuevo o escríbenos por WhatsApp.' });
      }
      return;
    }
    const href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary(v) + '\n')}`;
    window.location.href = href;
    setStatus({ type: 'ok', text: `Se abrió tu aplicación de correo con la solicitud lista. Solo presiona enviar. Si no se abrió, escríbenos a ${CONTACT.email} o usa WhatsApp.` });
  };

  const sendWhatsApp = () => {
    if (!check()) return;
    window.open(waLink(`Hola, quiero cotizar café al por mayor.\n\n${summary(v)}`), '_blank', 'noopener');
    setStatus({ type: 'ok', text: 'Se abrió WhatsApp con tu solicitud lista para enviar.' });
  };

  const inv = (k) => ({ 'aria-invalid': errors[k] ? 'true' : 'false', 'aria-describedby': errors[k] ? `${k}-error` : undefined });

  return (
    <section id="contacto" className="scroll-mt-16 bg-arena" aria-labelledby="contact-title">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
        <div>
          <h2 id="contact-title" className="font-display text-[2.6rem] font-medium leading-[1.02] text-grano sm:text-6xl">
            Contacto
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-grano/70">
            Cuéntanos qué necesitas y te enviamos la nota de venta. Compra mínima de {CONDITIONS.minKg} kg en total.
          </p>
          <div className="mt-10 space-y-6">
            <div>
              <p className="text-sm text-grano/60">WhatsApp</p>
              <a href={waLink('Hola, tengo una consulta sobre su café.')} target="_blank" rel="noreferrer" className="font-display text-3xl text-grano hover:text-espresso">
                {CONTACT.phone}
              </a>
            </div>
            <div>
              <p className="text-sm text-grano/60">Correo</p>
              <a href={`mailto:${CONTACT.email}`} className="break-all font-display text-3xl text-grano hover:text-espresso">
                {CONTACT.email}
              </a>
            </div>
            <a href={waLink('Hola, tengo una consulta sobre su café.')} target="_blank" rel="noreferrer" className="btn-dark">
              <ChatIcon size={18} />
              Escribir por WhatsApp
            </a>
          </div>
        </div>

        <form noValidate onSubmit={onSubmit} className="rounded-[22px] bg-crema p-6 shadow-[0_24px_60px_-35px_rgba(43,23,15,0.5)] sm:p-9" aria-label="Solicitud de cotización">
          <h3 className="font-display text-3xl font-medium text-grano">Solicita tu cotización</h3>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field id="nombre" label="Nombre" error={errors.nombre}>
              <input id="nombre" className="field" autoComplete="name" maxLength={80} value={v.nombre} onChange={set('nombre')} {...inv('nombre')} />
            </Field>
            <Field id="empresa" label="Empresa" optional>
              <input id="empresa" className="field" autoComplete="organization" maxLength={80} value={v.empresa} onChange={set('empresa')} />
            </Field>
            <Field id="telefono" label="Teléfono" error={errors.telefono}>
              <input id="telefono" type="tel" className="field" autoComplete="tel" inputMode="tel" placeholder="+56 9 1234 5678" maxLength={20} value={v.telefono} onChange={set('telefono')} {...inv('telefono')} />
            </Field>
            <Field id="correo" label="Correo" error={errors.correo}>
              <input id="correo" type="email" className="field" autoComplete="email" maxLength={120} value={v.correo} onChange={set('correo')} {...inv('correo')} />
            </Field>
            <Field id="region" label="Región" error={errors.region}>
              <select id="region" className="field" value={v.region} onChange={set('region')} {...inv('region')}>
                <option value="">Selecciona tu región</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="kg" label="Volumen estimado (kg)" error={errors.kg}>
              <input id="kg" type="number" className="field" inputMode="numeric" min={CONDITIONS.minKg} step={1} placeholder={`Mínimo ${CONDITIONS.minKg}`} value={v.kg} onChange={set('kg')} {...inv('kg')} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="mensaje" label="Mensaje" optional>
                <textarea id="mensaje" rows={3} className="field resize-y" maxLength={800} placeholder="Variedades de interés, frecuencia de compra, marca propia…" value={v.mensaje} onChange={set('mensaje')} />
              </Field>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="submit" className="btn-dark" disabled={status.type === 'sending'}>
              {status.type === 'sending' ? 'Enviando…' : 'Enviar por correo'}
            </button>
            <button type="button" onClick={sendWhatsApp} className="btn-outline">
              <ChatIcon size={18} />
              Enviar por WhatsApp
            </button>
          </div>
          <p
            role="status"
            className={`mt-4 min-h-[1.25rem] text-[13px] ${status.type === 'error' ? 'text-red-800' : 'text-grano/70'}`}
          >
            {status.text}
          </p>
        </form>
      </div>
    </section>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={waLink('Hola, tengo una consulta sobre su café.')}
      target="_blank"
      rel="noreferrer"
      aria-label={`Escribir por WhatsApp al ${CONTACT.phone}`}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-medium text-[#0B3B22] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)] transition hover:brightness-105 focus-visible:outline-offset-4"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ChatIcon />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
