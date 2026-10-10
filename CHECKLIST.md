# Checklist de verificación

Leyenda: ✅ verificado · ⏳ pendiente (no lo he podido comprobar desde aquí).

## Verificado (Chrome 64 bits en Windows, WebGL por software, `npm run test:smoke`)

- ✅ La web carga sin errores de consola (escritorio 1280×720).
- ✅ Hover sobre planeta muestra tooltip; hover sobre luna muestra skill y nivel.
- ✅ Clic en planeta: zoom de cámara, panel con skills (barras animadas) y proyectos; la URL pasa a `?planet=<id>`.
- ✅ «Volver al sistema», tecla `Esc` y chips de navegación funcionan.
- ✅ `?planet=bases-de-datos` abre directo ese planeta; un id inexistente no rompe nada.
- ✅ `prefers-reduced-motion`: los planetas no se mueven (y sí se mueven sin esa preferencia).
- ✅ Móvil emulado (390×844, táctil): el tap enfoca el planeta, el panel es un bottom sheet y no hay scroll horizontal.
- ✅ Sin WebGL: se muestra la lista HTML con las 5 categorías.
- ✅ `galaxy.svg` renderizado en Chrome en modo oscuro y en modo claro (forzado), 16 KB (< 200 KB).
- ✅ Build de producción (`npm run build`) con base relativa; favicon y scripts con rutas relativas.
- ✅ Validador: rechaza un nivel fuera de 0–100. Telemetría probada contra la API pública de GitHub.

## Pendiente de comprobar por ti

- ⏳ **Safari (macOS e iOS):** escena 3D, panel, SMIL del SVG y gestos táctiles.
- ⏳ **Móvil real** (Android/iOS): rendimiento con la GPU real, pellizco para zoom, área segura (notch) y barra del navegador.
- ⏳ **Firefox / Edge** (no probados).
- ⏳ **Cómo se ve `galaxy.svg` dentro del README en github.com** en tema claro y oscuro (la prueba de claro/oscuro fue en Chrome local; GitHub aplica el tema del sistema o del navegador).
- ⏳ **Primer despliegue:** activar Pages (*Source: GitHub Actions*) y comprobar que el workflow termina en verde.
- ⏳ **Workflow del perfil:** comprobar que puede hacer push (Settings → Actions → *Read and write permissions*).
- ⏳ **Open Graph:** pegar la URL en un validador (p. ej. el depurador de compartir de LinkedIn/Facebook) tras desplegar.
- ⏳ **Lector de pantalla:** revisión con VoiceOver/NVDA.
- ⏳ **Contenido:** reemplazar todos los datos `TODO` (skills de ejemplo, enlaces de proyectos, título, contacto, correo).

## Limitaciones conocidas

- En el SVG del README, `prefers-reduced-motion` detiene el titileo de estrellas pero no el movimiento SMIL de planetas y lunas (SMIL no es controlable por CSS).
- Con muchas categorías (> 8) el SVG y la escena se vuelven densos; ajusta radios en `scripts/generate-svg.js` y `src/scene.js`.
