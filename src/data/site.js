// Datos de contacto (aparecen en el formulario, el botón flotante y el pie de página).
export const CONTACT = {
  email: 'ventas@corporatecoffee.cl',
  phone: '+56 9 9325 5510',
  whatsapp: '+56993255510',
  instagram: '', // ej.: 'cafeamati'
  website: '', // ej.: 'https://corporatecoffee.cl'

  // Envío directo del formulario (opcional).
  // Vacío: el formulario abre el correo del cliente con todo completado (no depende de terceros).
  // Para que llegue directo a la bandeja sin abrir el correo, usa por ejemplo FormSubmit:
  //   formEndpoint: 'https://formsubmit.co/ajax/ventas@corporatecoffee.cl',
  // La primera vez, FormSubmit envía un correo de activación a esa casilla: hay que confirmarlo.
  formEndpoint: 'https://formsubmit.co/ajax/ventas@corporatecoffee.cl',
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
