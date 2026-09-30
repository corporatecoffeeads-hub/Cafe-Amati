// Datos de contacto (formulario, botón flotante y pie de página). Las solicitudes se envían por WhatsApp.
export const CONTACT = {
  phone: '+56 9 9325 5510',
  whatsapp: '+56993255510',
  instagram: '', // ej.: 'cafeamati'
  website: '', // ej.: 'https://corporatecoffee.cl'
};

export const waLink = (text = '') =>
  `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const REGIONS = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "Libertador General Bernardo O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén del General Carlos Ibáñez del Campo',
  'Magallanes y de la Antártica Chilena',
];
