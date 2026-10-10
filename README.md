# space-portfolio

Simulación 3D de mis skills como un sistema solar. Hecha con **Vite + Three.js (JavaScript vanilla)**, desplegada en GitHub Pages.

- **Planeta** = categoría de skills · **Luna** = skill (tamaño según nivel) · **Estación orbital** = proyecto.
- Clic en un planeta: la cámara hace zoom suave y se abre un panel con skills (barras de nivel) y proyectos.
- Entrada directa con `?planet=<id>` (por ejemplo `?planet=backend`).

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
npm run preview      # sirve dist/
npm run test:smoke   # prueba de humo en Chrome real (necesita `npm run dev` activo y CHROME_PATH si no es la ruta por defecto)
```

## Datos (fuente única)

Todo sale de `skills.json` del repo de perfil (`SergioMaje/SergioMaje`). La web lo lee así (`src/data.js`):

1. **Producción:** descarga `https://raw.githubusercontent.com/SergioMaje/SergioMaje/main/skills.json` (3,5 s de límite) → editar el JSON del perfil actualiza la web **sin redeploy**.
2. **Respaldo / desarrollo:** `public/skills.json`, una copia local. Se sincroniza desde el repo de perfil con `npm run sync` (ver su `DESARROLLO.md`).

Si el JSON remoto no cumple el formato mínimo, se ignora y se usa la copia local.

> **TODO:** si cambias de usuario o de rama, edita `URL_REMOTA` en `src/data.js` y las URLs de `index.html` (Open Graph).

## Estructura

```
index.html            Shell HTML: escena, barra de planetas, panel, tooltip, cargador, fallback
src/main.js           Arranque: datos → comprobación de WebGL → import() diferido de la escena
src/data.js           Carga y validación mínima de skills.json
src/scene.js          Escena Three.js (sol, planetas, lunas, estaciones, cámara, raycasting, dispose)
src/ui.js             Panel lateral/bottom sheet, chips de navegación, tooltip, lista sin WebGL
src/style.css         Estilos (neón minimalista, responsive, reduced-motion)
public/               skills.json (copia), favicon.svg, og-image.png
scripts/smoke-test.mjs  Prueba de humo con puppeteer-core
.github/workflows/deploy.yml  Build + deploy a Pages en cada push a main
```

## Decisiones técnicas

- **Carga diferida:** Three.js va en un chunk aparte (`import('./scene.js')`); el cargador y la lista sin WebGL no lo necesitan.
- **Geometrías simples y compartidas:** una esfera y una caja para todo el sistema; los objetos se escalan. En móvil: menos segmentos, menos estrellas, `antialias` desactivado y `pixelRatio` ≤ 1,5.
- **Picking:** esferas proxy invisibles (más grandes que la luna) hacen cómodo el clic/tap. En vista general solo se pueden elegir planetas; en foco, también las lunas y estaciones de ese planeta.
- **Cámara:** al enfocar, el planeta se detiene en su órbita y la cámara se interpola (`easeInOutCubic`). Se usa `camera.setViewOffset` para dejar espacio al panel (derecha en escritorio, abajo en móvil).
- **Accesibilidad:** la barra de planetas es navegable con teclado (`Esc` vuelve), el panel usa `inert` cuando está cerrado, y `prefers-reduced-motion` detiene órbitas/rotaciones y hace instantáneas las transiciones de cámara.
- **Liberación de recursos:** `liberarRecursos()` hace `dispose` de geometrías, materiales, texturas, controles y renderer (en `pagehide` y al perder el contexto WebGL).
- **Seguridad:** los datos se insertan con `textContent` (nunca `innerHTML`) y los enlaces solo se aceptan si son `http(s)`.

## Despliegue

Settings → Pages → *Source: GitHub Actions*. Cada push a `main` ejecuta `.github/workflows/deploy.yml`.
