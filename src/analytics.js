// Medición con Google Analytics 4 (el ID está en index.html).
// Si gtag no cargó (bloqueadores, sin conexión), las llamadas se ignoran sin errores.
export function track(event, params = {}) {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
  } catch {
    /* sin medición */
  }
}

/**
 * Registra automáticamente cada clic en un enlace de WhatsApp.
 * Ubicación: atributo data-wa del elemento o, si no tiene, el id de la sección donde está.
 */
export function initWhatsAppTracking() {
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest?.('a[href^="https://wa.me/"]');
      if (!a) return;
      const ubicacion = a.closest('[data-wa]')?.dataset.wa || a.closest('section, footer')?.id || (a.closest('footer') ? 'pie_de_pagina' : 'otro');
      track('click_whatsapp', { ubicacion });
    },
    true,
  );
}
