// Escena Three.js: sol, planetas (categorías), lunas (skills) y estaciones (proyectos).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createUI } from './ui.js';
import { esUrlSegura } from './data.js';

const FOV = 55;
const DIR_GENERAL = new THREE.Vector3(0, 0.62, 0.79).normalize(); // dirección de la cámara en la vista general

const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Textura radial blanca reutilizable (brillos y estrellas redondas). */
function texturaBrillo() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Bandas horizontales con el color de la categoría (aspecto de gigante gaseoso). */
function texturaPlaneta(color, semilla) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 128);
  let s = semilla * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 0; y < 128; ) {
    const h = 3 + rnd() * 12;
    g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.04 + rnd() * 0.16})` : `rgba(0,0,0,${0.06 + rnd() * 0.2})`;
    g.fillRect(0, y, 256, h);
    y += h;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaEtiqueta(texto, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.font = '600 44px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 14;
  g.fillStyle = '#eaf0ff';
  g.fillText(texto, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearEscena({ contenedor, datos, planetaInicial, alFallar }) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = matchMedia('(pointer: coarse)').matches || innerWidth < 720;
  const esPantallaChica = () => matchMedia('(max-width: 720px)').matches;

  // ---------- renderer, cámara, controles ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !movil, powerPreference: 'high-performance' });
  } catch (e) {
    alFallar('No se pudo crear el contexto WebGL, así que te muestro la versión en texto.');
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.5 : 2));
  renderer.setClearColor(0x05070f);
  const canvas = renderer.domElement;
  canvas.tabIndex = -1;
  contenedor.append(canvas);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, 1, 0.1, 1200);
  const controles = new OrbitControls(camara, canvas);
  controles.enableDamping = true;
  controles.dampingFactor = 0.07;
  controles.enablePan = false;
  controles.rotateSpeed = 0.7;
  controles.maxPolarAngle = Math.PI * 0.92;
  controles.minPolarAngle = Math.PI * 0.06;
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

  // ---------- luces ----------
  escena.add(new THREE.AmbientLight(0x7d8fd0, 1.3));
  escena.add(new THREE.PointLight(0xfff1d6, 6, 0, 0)); // sin atenuación: brillo predecible

  // ---------- recursos compartidos ----------
  const geoEsfera = new THREE.SphereGeometry(1, movil ? 20 : 32, movil ? 14 : 22);
  const geoCaja = new THREE.BoxGeometry(1, 1, 1);
  const texBrillo = texturaBrillo();
  const matProxy = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const raycaster = new THREE.Raycaster();

  // Estrellas de fondo (menos en móvil)
  const nEstrellas = movil ? 900 : 2600;
  const pos = new Float32Array(nEstrellas * 3), col = new Float32Array(nEstrellas * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < nEstrellas; i++) {
    const r = 350 + Math.random() * 250, u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, k = Math.sqrt(1 - u * u);
    pos.set([r * k * Math.cos(a), r * u, r * k * Math.sin(a)], i * 3);
    tmp.setHSL(0.55 + Math.random() * 0.15, 0.5, 0.6 + Math.random() * 0.4);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geoEstrellas.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const estrellas = new THREE.Points(geoEstrellas, new THREE.PointsMaterial({
    size: movil ? 6 : 5, map: texBrillo, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  escena.add(estrellas);

  // Sol
  const sol = new THREE.Mesh(geoEsfera, new THREE.MeshBasicMaterial({ color: 0xffc24d }));
  sol.scale.setScalar(4.6);
  const brilloSol = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: 0xff9a2e, blending: THREE.AdditiveBlending, depthWrite: false }));
  brilloSol.scale.setScalar(26);
  escena.add(sol, brilloSol);

  // ---------- planetas, lunas y estaciones ----------
  const planetas = [];
  const radioMax = 14 + (datos.categories.length - 1) * 9.5;

  datos.categories.forEach((cat, i) => {
    const color = new THREE.Color(cat.color);
    const media = cat.skills.reduce((a, s) => a + s.level, 0) / (cat.skills.length || 1);
    const radio = 1.3 + (media / 100) * 1.1;
    const orbitaR = 14 + i * 9.5;
    const P = {
      cat, i, radio, orbitaR,
      angulo: i * 2.1 + 0.6, vel: 0.11 / (1 + i * 0.5),
      congelado: false, grupo: new THREE.Group(), lunas: [], estaciones: [], anillos: [], extension: radio,
    };

    // Anillo de órbita alrededor del sol
    const pts = Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos((k / 128) * Math.PI * 2) * orbitaR, 0, Math.sin((k / 128) * Math.PI * 2) * orbitaR));
    escena.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 })));

    // Cuerpo del planeta
    P.malla = new THREE.Mesh(geoEsfera, new THREE.MeshStandardMaterial({
      map: texturaPlaneta(cat.color, i + 1), emissive: color, emissiveIntensity: 0.22, roughness: 0.75, metalness: 0.05,
    }));
    P.malla.scale.setScalar(radio);
    P.malla.rotation.z = 0.25;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    halo.scale.setScalar(radio * 4.2);
    const etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEtiqueta(cat.name, cat.color), transparent: true, depthWrite: false }));
    etiqueta.scale.set(11, 2.06, 1);
    etiqueta.position.y = radio + 2.4;
    P.etiqueta = etiqueta;
    P.grupo.add(P.malla, halo, etiqueta);

    P.proxy = new THREE.Mesh(geoEsfera, matProxy);
    P.proxy.scale.setScalar(radio * 1.6);
    P.proxy.userData = { tipo: 'planeta', P, objetivo: P.malla, base: radio, escala: radio, escalaMeta: radio };
    P.grupo.add(P.proxy);
    P.malla.userData.proxy = P.proxy;

    // Lunas: una por skill
    cat.skills.forEach((sk, k) => {
      const dist = radio + 1.7 + k * 1.15;
      const r = 0.22 + (sk.level / 100) * 0.3;
      const pivote = new THREE.Group();
      pivote.rotation.y = (k / cat.skills.length) * Math.PI * 2;
      const m = new THREE.Mesh(geoEsfera, new THREE.MeshStandardMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.35), emissive: color, emissiveIntensity: 0.35, roughness: 0.6 }));
      m.scale.setScalar(r); m.position.x = dist;
      const px = new THREE.Mesh(geoEsfera, matProxy);
      px.scale.setScalar(Math.max(r * 2.2, 0.7)); px.position.x = dist;
      px.userData = { tipo: 'luna', P, skill: sk, objetivo: m, base: r, escala: r, escalaMeta: r };
      pivote.add(m, px);
      P.grupo.add(pivote);
      P.lunas.push({ pivote, vel: 0.9 / (1 + k * 0.45), proxy: px });
      const anillo = anilloOrbita(dist, color);
      P.grupo.add(anillo); P.anillos.push(anillo);
      P.extension = Math.max(P.extension, dist + r);
    });

    // Estaciones: una por proyecto, en órbitas inclinadas más externas
    cat.projects.forEach((pr, j) => {
      const dist = P.extension + 1.6 + j * 0.2;
      const inclin = new THREE.Group();
      inclin.rotation.set(0.55 + j * 0.5, 0, 0.3 - j * 0.35);
      const pivote = new THREE.Group();
      pivote.rotation.y = j * 2;
      const est = crearEstacion(color);
      est.position.x = dist;
      const px = new THREE.Mesh(geoEsfera, matProxy);
      px.scale.setScalar(0.95); px.position.x = dist;
      px.userData = { tipo: 'estacion', P, proyecto: pr, objetivo: est, base: 1, escala: 1, escalaMeta: 1 };
      pivote.add(est, px);
      inclin.add(pivote);
      const anillo = anilloOrbita(dist, color);
      inclin.add(anillo); P.anillos.push(anillo);
      P.grupo.add(inclin);
      P.estaciones.push({ pivote, vel: 0.35 + j * 0.05, proxy: px, est });
      P.extension = Math.max(P.extension, dist + 1);
    });

    P.anillos.forEach((a) => { a.visible = false; });
    escena.add(P.grupo);
    planetas.push(P);
  });

  function anilloOrbita(r, color) {
    const pts = Array.from({ length: 65 }, (_, k) => new THREE.Vector3(Math.cos((k / 64) * Math.PI * 2) * r, 0, Math.sin((k / 64) * Math.PI * 2) * r));
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 }));
  }

  function crearEstacion(color) {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(geoCaja, new THREE.MeshStandardMaterial({ color: 0xdfe8ff, emissive: color, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.6 }));
    cuerpo.scale.set(0.5, 0.3, 0.3);
    const matPanel = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3 });
    for (const lado of [-1, 1]) {
      const panel = new THREE.Mesh(geoCaja, matPanel);
      panel.scale.set(0.75, 0.03, 0.38);
      panel.position.x = lado * 0.7;
      g.add(panel);
    }
    g.add(cuerpo);
    return g;
  }

  // ---------- estado de cámara ----------
  const vista = { x: 0, y: 0 }; // desplazamiento de vista (deja sitio al panel)
  let foco = null;
  let tween = null;

  const ajustar = (extension, factor = 1) => {
    const vfov = (FOV * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camara.aspect);
    return (extension * factor) / Math.sin(Math.min(vfov, hfov) / 2);
  };
  const distGeneral = () => ajustar(radioMax + 6, 0.62);

  function desplazamientoPanel() {
    if (!foco) return { x: 0, y: 0 };
    const w = innerWidth, h = innerHeight;
    if (esPantallaChica()) return { x: 0, y: h * 0.52 * 0.5 };
    return { x: Math.max(Math.min(400, w * 0.4), 320) / 2, y: 0 };
  }

  function aplicarVista() {
    if (Math.abs(vista.x) < 0.5 && Math.abs(vista.y) < 0.5) camara.clearViewOffset();
    else camara.setViewOffset(innerWidth, innerHeight, vista.x, vista.y, innerWidth, innerHeight);
  }

  function iniciarTween(aPos, aObjetivo, aVista, dur, alTerminar) {
    controles.enabled = false;
    controles.enableDamping = false; controles.update(); controles.enableDamping = true; // descarta inercia
    controles.minDistance = 0; controles.maxDistance = Infinity;
    tween = {
      t0: performance.now(), dur: reducido ? 1 : dur * 1000,
      dePos: camara.position.clone(), aPos,
      deObj: controles.target.clone(), aObjetivo,
      deVista: { ...vista }, aVista, alTerminar,
    };
  }

  function actualizarTween(ahora) {
    if (!tween) return;
    const k = Math.min((ahora - tween.t0) / tween.dur, 1), e = suave(k);
    camara.position.lerpVectors(tween.dePos, tween.aPos, e);
    controles.target.lerpVectors(tween.deObj, tween.aObjetivo, e);
    vista.x = tween.deVista.x + (tween.aVista.x - tween.deVista.x) * e;
    vista.y = tween.deVista.y + (tween.aVista.y - tween.deVista.y) * e;
    camara.lookAt(controles.target);
    aplicarVista();
    if (k >= 1) {
      const fin = tween.alTerminar; tween = null;
      controles.enabled = true;
      fin?.();
    }
  }

  function enfocar(id, { silencioso = false } = {}) {
    const P = planetas.find((p) => p.cat.id === id);
    if (!P) return;
    if (foco && foco !== P) liberar(foco);
    foco = P;
    P.congelado = true;
    P.etiqueta.visible = false;
    P.anillos.forEach((a) => { a.visible = true; });
    limpiarHover();
    ui.abrirPanel(P.cat);
    if (!silencioso) history.replaceState(null, '', `?planet=${encodeURIComponent(id)}`);

    const centro = P.grupo.position.clone();
    const radial = new THREE.Vector3(-centro.x, 0, -centro.z).normalize();   // hacia el sol: mitad iluminada visible
    const tangente = new THREE.Vector3(-centro.z, 0, centro.x).normalize();
    const dir = radial.multiplyScalar(0.3).add(tangente.multiplyScalar(0.75)).add(new THREE.Vector3(0, 0.55, 0)).normalize();
    const dist = ajustar(P.extension + 0.8, 1.15);
    iniciarTween(centro.clone().addScaledVector(dir, dist), centro, desplazamientoPanel(), 1.5, () => {
      controles.minDistance = P.radio * 2.4;
      controles.maxDistance = dist * 2.2;
    });
  }

  function liberar(P) {
    P.congelado = false;
    P.etiqueta.visible = true;
    P.anillos.forEach((a) => { a.visible = false; });
  }

  function volverAlSistema() {
    if (!foco) return;
    liberar(foco);
    foco = null;
    limpiarHover();
    ui.cerrarPanel();
    history.replaceState(null, '', location.pathname);
    const d = distGeneral();
    iniciarTween(DIR_GENERAL.clone().multiplyScalar(d), new THREE.Vector3(), { x: 0, y: 0 }, 1.4, () => {
      controles.minDistance = 22; controles.maxDistance = d * 1.8;
    });
  }

  // ---------- interfaz ----------
  const ui = createUI(datos, { onSelect: (id) => enfocar(id), onBack: volverAlSistema });

  // ---------- interacción (hover / clic) ----------
  const puntero = new THREE.Vector2();
  let hover = null, pendiente = false, mx = 0, my = 0, abajo = null, fijarTooltip = 0;

  const candidatos = () => {
    const l = planetas.map((p) => p.proxy);
    if (foco) for (const o of [...foco.lunas, ...foco.estaciones]) l.push(o.proxy);
    return l;
  };
  function elegir(x, y) {
    const r = canvas.getBoundingClientRect();
    puntero.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(puntero, camara);
    return raycaster.intersectObjects(candidatos(), false)[0]?.object ?? null;
  }
  function describir(px) {
    const u = px.userData, c = u.P.cat.color;
    if (u.tipo === 'planeta') return [u.P.cat.name, `${u.P.cat.skills.length} skills · ${u.P.cat.projects.length} proyectos · clic para explorar`, c];
    if (u.tipo === 'luna') return [u.skill.name, `Nivel ${u.skill.level}%`, c];
    return [u.proyecto.name, esUrlSegura(u.proyecto.url) ? 'Proyecto · clic para abrir' : 'Proyecto · enlace próximamente', c];
  }
  function fijarHover(px, x, y) {
    if (hover && hover !== px) hover.userData.escalaMeta = hover.userData.base;
    hover = px;
    if (!px) { ui.ocultarTooltip(); ui.resaltarSkill(null); canvas.style.cursor = ''; return; }
    px.userData.escalaMeta = px.userData.base * (px.userData.tipo === 'planeta' ? 1.14 : 1.5);
    const [t, d, c] = describir(px);
    ui.mostrarTooltip(t, d, x, y, c);
    ui.resaltarSkill(px.userData.tipo === 'luna' ? px.userData.skill.name : null);
    canvas.style.cursor = 'pointer';
  }

  /** Quita el resaltado al cambiar de planeta (cambian los candidatos). */
  function limpiarHover() {
    if (hover) {
      const u = hover.userData;
      u.escala = u.escalaMeta = u.base;
      u.objetivo.scale.setScalar(u.base);
      hover = null;
    }
    ui.ocultarTooltip();
    ui.resaltarSkill(null);
  }

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || e.buttons) return;
    mx = e.clientX; my = e.clientY; pendiente = true;
  });
  canvas.addEventListener('pointerleave', () => { pendiente = false; fijarHover(null); });
  canvas.addEventListener('pointerdown', (e) => { abajo = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!abajo) return;
    const corto = Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) < 6 && performance.now() - abajo.t < 500;
    abajo = null;
    if (!corto) return;
    const px = elegir(e.clientX, e.clientY);
    if (!px) return;
    const u = px.userData;
    if (u.tipo === 'planeta') { if (u.P !== foco) enfocar(u.P.cat.id); return; }
    if (u.tipo === 'estacion' && esUrlSegura(u.proyecto.url)) { open(u.proyecto.url, '_blank', 'noopener,noreferrer'); return; }
    // En táctil no hay hover: muestra el tooltip unos segundos
    const [t, d, c] = describir(px);
    ui.mostrarTooltip(t, d, e.clientX, e.clientY, c);
    ui.resaltarSkill(u.tipo === 'luna' ? u.skill.name : null);
    clearTimeout(fijarTooltip);
    fijarTooltip = setTimeout(() => { ui.ocultarTooltip(); ui.resaltarSkill(null); }, 2600);
  });

  // ---------- bucle ----------
  const reloj = new THREE.Clock();
  const colocar = (P) => P.grupo.position.set(Math.cos(P.angulo) * P.orbitaR, 0, Math.sin(P.angulo) * P.orbitaR);
  planetas.forEach(colocar);

  function tick() {
    const dt = Math.min(reloj.getDelta(), 0.05);
    if (!reducido) {
      for (const P of planetas) {
        if (!P.congelado) { P.angulo += P.vel * dt; colocar(P); }
        P.malla.rotation.y += 0.3 * dt;
        for (const l of P.lunas) l.pivote.rotation.y += l.vel * dt;
        for (const s of P.estaciones) { s.pivote.rotation.y += s.vel * dt; s.est.rotation.y += 0.6 * dt; }
      }
      estrellas.rotation.y += 0.004 * dt;
    }
    // Suaviza el resaltado por hover
    for (const px of candidatos()) {
      const u = px.userData;
      if (Math.abs(u.escala - u.escalaMeta) > 0.001) {
        u.escala += (u.escalaMeta - u.escala) * Math.min(1, dt * 12);
        u.objetivo.scale.setScalar(u.escala);
      }
    }
    actualizarTween(performance.now());
    if (!tween) controles.update();
    if (pendiente && !tween) { pendiente = false; const px = elegir(mx, my); fijarHover(px?.userData.P === foco && px.userData.tipo === 'planeta' ? null : px, mx, my); }
    renderer.render(escena, camara);
  }

  // ---------- tamaño ----------
  function redimensionar() {
    const w = contenedor.clientWidth || innerWidth, h = contenedor.clientHeight || innerHeight;
    renderer.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    if (!tween) {
      const v = desplazamientoPanel(); vista.x = v.x; vista.y = v.y; aplicarVista();
      if (!foco) { // mantiene el encuadre general al girar el dispositivo
        const d = distGeneral();
        const dir = camara.position.clone().sub(controles.target).normalize(); // antes de mover la cámara
        camara.position.copy(controles.target).addScaledVector(dir, d);
        controles.maxDistance = d * 1.8;
      }
    }
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(contenedor);

  // Estado inicial: vista general
  redimensionar();
  const d0 = distGeneral();
  camara.position.copy(DIR_GENERAL).multiplyScalar(d0);
  controles.minDistance = 22; controles.maxDistance = d0 * 1.8;
  controles.update();

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    liberarRecursos();
    alFallar('Se perdió el contexto gráfico, así que te muestro la versión en texto.');
  });

  renderer.setAnimationLoop(tick);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ui.ocultarCarga();
    if (planetaInicial) setTimeout(() => enfocar(planetaInicial, { silencioso: true }), 350);
  }));

  // ---------- liberar recursos ----------
  function liberarRecursos() {
    renderer.setAnimationLoop(null);
    observador.disconnect();
    controles.dispose();
    escena.traverse((o) => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material ?? [])) { m.map?.dispose(); m.dispose(); }
    });
    renderer.dispose();
    canvas.remove();
  }
  addEventListener('pagehide', liberarRecursos, { once: true });

  if (import.meta.env.DEV) window.__space = { planetas, camara, controles, enfocar, volverAlSistema }; // solo depuración

  return { enfocar, volverAlSistema, liberarRecursos };
}
