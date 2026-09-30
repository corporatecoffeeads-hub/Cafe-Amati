// Fuente de verdad: «Catálogo Mayorista 2026» (PDF).
// Los niveles 1–3 corresponden a los íconos de granos rellenos del PDF (lámina «Nuestro café.»).
import ineffabile from '../assets/bags/ineffabile.webp';
import eternita from '../assets/bags/eternita.webp';
import vulcano from '../assets/bags/vulcano.webp';
import segreto from '../assets/bags/segreto.webp';
import forza from '../assets/bags/forza.webp';
import amaretto from '../assets/bags/amaretto.webp';
import calafate from '../assets/bags/calafate.webp';
import caramelo from '../assets/bags/caramelo.webp';
import chocolate from '../assets/bags/chocolate.webp';
import vainilla from '../assets/bags/vainilla.webp';

export const PRICES = {
  clasico: 16900,
  aromatizado: 17900,
};

export const CONDITIONS = {
  minKg: 5,
  unit: 'bolsa de 1 kg',
  note: 'Valores netos, más IVA.',
};

export const ATTRIBUTES = [
  { key: 'intensidad', label: 'Intensidad', levels: ['Suave', 'Media', 'Alta'] },
  { key: 'tueste', label: 'Tueste', levels: ['Ligero', 'Medio', 'Alto'] },
  { key: 'acidez', label: 'Acidez', levels: ['Baja', 'Media', 'Alta'] },
];

export const CLASSICS = [
  { id: 'ineffabile', name: 'Ineffabile', image: ineffabile, accent: '#C98FC8', attrs: { intensidad: 2, tueste: 2, acidez: 2 } },
  { id: 'eternita', name: 'Eternita', image: eternita, accent: '#1E9C96', attrs: { intensidad: 2, tueste: 3, acidez: 2 } },
  { id: 'vulcano', name: 'Vulcano', image: vulcano, accent: '#E2471F', attrs: { intensidad: 3, tueste: 3, acidez: 2 } },
  { id: 'segreto', name: 'Segreto', image: segreto, accent: '#EE6A3A', attrs: { intensidad: 2, tueste: 2, acidez: 1 } },
  { id: 'forza', name: 'Forza', image: forza, accent: '#3A3A3A', attrs: { intensidad: 3, tueste: 3, acidez: 1 } },
].map((p) => ({ ...p, category: 'clasico', price: PRICES.clasico }));

export const FLAVORED = [
  { id: 'amaretto', name: 'Amaretto', flavor: 'Amaretto', image: amaretto, accent: '#7A4520' },
  { id: 'calafate', name: 'Calafate', flavor: 'Calafate', image: calafate, accent: '#5B2A7E' },
  { id: 'caramelo', name: 'Caramelo', flavor: 'Caramelo', image: caramelo, accent: '#E2541E' },
  { id: 'chocolate', name: 'Chocolate', flavor: 'Chocolate', image: chocolate, accent: '#4A2413' },
  { id: 'vainilla', name: 'Vainilla', flavor: 'Vainilla', image: vainilla, accent: '#E8A91F' },
].map((p) => ({ ...p, category: 'aromatizado', price: PRICES.aromatizado }));

export const FLAVORED_TAGLINE = 'Café Amati 100% Arábica, ahora aromatizado.';
export const CLASSIC_TAGLINE = 'Café Amati 100% Arábica.';

// Lámina «Tipos de granos».
export const BEAN = {
  species: 'Arábica',
  origin: 'Perú',
  regions: 'Amazonas, Cajamarca y Lambayeque',
  profile: 'Buen cuerpo, acidez media, sabores a chocolate, nueces y cítricos.',
  score: '+80.5',
  altitude: '1.200 a 2.050 msnm',
};

// Lámina «¿Por qué elegirnos como tu aliado?».
export const REASONS = [
  { title: 'Trazabilidad al 100%', text: 'Desde la finca a tu taza.', featured: true },
  { title: 'Importamos café verde', text: 'Traemos café verde de diferentes orígenes.' },
  { title: 'Casa de tueste propia', text: 'Tostamos en nuestra propia casa de tueste.' },
  { title: 'Tueste semanal', text: 'El café se tuesta cada semana, siempre fresco.' },
  { title: 'Entregas en todo Chile', text: 'Despachamos a lo largo de todo el país.' },
  { title: 'Stock para todo el año', text: 'Stock anualizado que asegura despacho los doce meses.' },
  { title: 'Solubles de Italia y España', text: 'Nuestros productos solubles son importados desde Italia y España.' },
];

// Lámina «¿Cómo realizar tu compra?».
export const STEPS = [
  { title: 'Selecciona tus productos', text: 'Elige variedades y cantidades. Compra mínima de 5 kg en total.' },
  { title: 'Recibe tu nota de venta', text: 'Te enviamos una nota de venta para que la revises y des tu OK.' },
  { title: 'Aprueba y paga', text: 'Paga por transferencia o link de pago.' },
  { title: 'Coordina la entrega', text: 'Entrega desde 5 días hábiles en la Región Metropolitana.' },
];

export const formatCLP = (n) => '$' + n.toLocaleString('es-CL');
