import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import './index.css';
import App from './App.jsx';
import { initWhatsAppTracking } from './analytics.js';

initWhatsAppTracking();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
