# Café Amati · Catálogo Mayorista 2026

Catálogo mayorista interactivo (no es una tienda online) con tres módulos:

1. **Nuestro café**: 5 clásicos y 5 aromatizados con empaques reales del PDF.
2. **Encuentra tu café ideal**: recomendador por intensidad, tueste, acidez o sabor.
3. **Crea tu marca**: simulador de bolsas personalizadas (negra/blanca, 250 g/1 kg) con logo, eliminación de fondo local y descarga en PNG de alta resolución.

Hecho con React 18, Vite 5 y Tailwind CSS 3. Funciona 100 % en el navegador, sin backend ni servicios externos (las fuentes van incluidas en el proyecto).

## Uso local

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # genera /dist
npm run preview   # sirve /dist localmente
```

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube el contenido de esta carpeta a la rama `main`.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica el sitio en `https://<usuario>.github.io/<repositorio>/`.

`vite.config.js` usa `base: './'`, así que las rutas de recursos funcionan con cualquier nombre de repositorio o dominio propio, sin cambios.

## Estructura

```
src/
  data/catalog.js        Productos, precios, atributos y textos (fuente: PDF)
  data/site.js           Datos de contacto (vacíos: el PDF no los incluye)
  components/            Secciones, recomendador, estudio y UI reutilizable
  studio/renderBag.js    Motor de montaje 2.5D en Canvas
  studio/logoTools.js    Carga/validación de logo, eliminación de fondo, logotipo tipográfico
  assets/                Imágenes extraídas del PDF y optimizadas (WebP)
```

## Cómo funciona «Crea tu marca»

- **Bolsas**: se dibujan de forma procedural en Canvas (recurso original, sin marcas de terceros). El logo y la etiqueta se imprimen en una capa plana que se deforma según la curvatura del frente y recibe encima la iluminación, los pliegues y la textura de la bolsa, para que no parezcan pegados.
- **Formato**: 1 kg es una bolsa alta y rectangular; 250 g, más baja, ancha y casi cuadrada.
- **Logo**: se centra en la mitad superior, conserva su proporción y se escala solo. Tamaño y posición se ajustan con controles (o arrastrando con el mouse) dentro de límites que impiden que toque la etiqueta.
- **Eliminación de fondo**: algoritmo local (relleno desde los bordes con tolerancia de color, bordes suavizados y limpieza del tinte del fondo). Se puede ajustar la tolerancia, quitar el fondo encerrado en letras o volver al original. Si la imagen ya es transparente, se usa tal cual.
- **Descarga**: PNG de 3000 × 3300 px, con fondo de estudio o transparente.

## Supuestos (información que el PDF no define)

- **Contacto**: WhatsApp +56 9 9325 5510, configurable en `src/data/site.js`. El formulario envía la solicitud completa por WhatsApp.
- **Compra mínima**: el PDF dice «Desde 5 kg»; se muestra como «5 kg en total», según el requerimiento.
- **Niveles**: intensidad, tueste y acidez se leyeron de los íconos del PDF (1 a 3). Los nombres de nivel (suave/media/alta, etc.) son la escala del recomendador.
- **Bolsas del simulador**: el PDF no trae bolsas lisas, por lo que se crearon como recursos originales. El resultado es referencial.
- **Aromatizados**: solo se indica su aroma y que son 100 % Arábica, tal como dice el PDF; no se atribuyen otras características.
- **Imágenes de producto**: son las del PDF, cuya resolución es baja (unos 125 × 207 px, salvo Vulcano). Para mayor nitidez, reemplaza los archivos de `src/assets/bags/` por versiones en alta resolución con el mismo nombre.
- **Solubles**: se mencionan en «¿Por qué elegirnos?» porque el PDF los nombra, pero no se muestran productos porque el PDF no los detalla.
