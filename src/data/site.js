// Datos de contacto (formulario, botón flotante y pie de página). Las solicitudes se envían por WhatsApp.
export const CONTACT = {
  phone: '+56 9 3701 7893',
  whatsapp: '+56937017893',
  instagram: '', // ej.: 'cafeamati'
  website: '', // ej.: 'https://corporatecoffee.cl'
};

export const waLink = (text = '', phone = CONTACT.whatsapp) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

// Destinatarios de las solicitudes de pedido.
export const ORDER_RECIPIENTS = [
  { id: 'atencion', name: 'Atención al cliente', note: 'Clientes nuevos', emoji: '💬', phone: CONTACT.whatsapp, display: CONTACT.phone },
  { id: 'fabiola', name: 'Fabiola', note: 'Ejecutiva comercial', emoji: '👩‍💼', phone: '+56994416080', display: '+56 9 9441 6080' },
  { id: 'trinimar', name: 'Trinimar', note: 'Ejecutiva comercial', emoji: '👩‍💼', phone: '+56948104181', display: '+56 9 4810 4181' },
  { id: 'david', name: 'David', note: 'Ejecutivo comercial', emoji: '👨‍💼', phone: '+56994283757', display: '+56 9 9428 3757' },
  { id: 'ignacio', name: 'Ignacio', note: 'Ejecutivo comercial', emoji: '👨‍💼', phone: '+56993255510', display: '+56 9 9325 5510' },
];

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
