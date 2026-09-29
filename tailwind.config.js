/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crema: '#FBF5EE',
        arena: '#F2DCC6',
        tostado: '#E6CDB3',
        espresso: '#4A2619',
        grano: '#2B170F',
        tinta: '#000000',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
