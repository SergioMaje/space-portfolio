// Prueba de humo en navegador real (Chrome + puppeteer-core). Requiere el servidor de desarrollo activo:
//   npm run dev   (en otra terminal)   y luego   CHROME_PATH=... npm run test:smoke
// Usa window.__space, que solo existe en modo desarrollo. Las capturas se guardan en ./smoke-out
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const SC = process.argv[2] ?? 'smoke-out';
mkdirSync(SC, { recursive: true });
const URL = process.argv[3] ?? 'http://localhost:5173/';
const exe = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (n, c, extra = '') => { res.push(`${c ? 'PASS' : 'FAIL'} ${n} ${extra}`); };

async function abrir(browser, vp, qs = '', opts = {}) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport(vp);
  if (opts.reducido) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(URL + qs, { waitUntil: 'load' });
  await page.waitForSelector('#loader', { hidden: true, timeout: 30000 }).catch(() => {});
  return { page, errs };
}
const proyectar = (page, tipo, idx = 0) => page.evaluate((tipo, idx) => {
  const S = window.__space; const P = S.planetas[idx[0]];
  const v = tipo === 'planeta' ? P.grupo.position.clone()
    : P.lunas[idx[1]].proxy.getWorldPosition(P.grupo.position.clone());
  v.project(S.camara);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
}, tipo, idx);

// ---------- Escritorio ----------
let browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: base });
{
  const { page, errs } = await abrir(browser, { width: 1280, height: 720 });
  await page.screenshot({ path: `${SC}/e-over.png` });
  ok('carga sin errores', errs.length === 0, errs.join('|'));
  const p = await proyectar(page, 'planeta', [1]);
  await page.mouse.move(p.x, p.y); await esperar(400);
  const tip = await page.$eval('#tooltip', (e) => (e.hidden ? '' : e.textContent));
  ok('hover planeta muestra tooltip', tip.includes('Frontend'), tip);
  await page.mouse.click(p.x, p.y); await esperar(2500);
  const st = await page.evaluate(() => ({ f: document.body.classList.contains('focused'), open: document.getElementById('panel').classList.contains('open'), q: location.search, h2: document.querySelector('#panel h2')?.textContent, w: [...document.querySelectorAll('.bar i')].map((b) => b.style.width) }));
  ok('clic enfoca y abre panel', st.f && st.open && st.h2 === 'Frontend', JSON.stringify(st));
  ok('URL actualizada', st.q === '?planet=frontend');
  ok('barras animadas', st.w.every((w) => w.endsWith('%')), st.w.join());
  await page.screenshot({ path: `${SC}/e-focus.png` });
  await page.close();
  const r = await abrir(browser, { width: 1280, height: 720 }, '?planet=frontend', { reducido: true });
  const page2 = r.page; await esperar(1500);
  const m = await proyectar(page2, 'luna', [1, 0]);
  await page2.mouse.move(m.x, m.y); await esperar(500);
  const tipM = await page2.$eval('#tooltip', (e) => (e.hidden ? '' : e.textContent));
  ok('hover luna muestra skill', /JavaScript|Angular|HTML/.test(tipM), tipM);
  await page2.screenshot({ path: `${SC}/e-moon.png` });
  await page2.click('#back'); await esperar(2500);
  const st2 = await page2.evaluate(() => ({ f: document.body.classList.contains('focused'), q: location.search, dist: window.__space.camara.position.length() }));
  ok('volver al sistema', !st2.f && st2.q === '', JSON.stringify(st2));
  await page2.click('#planet-nav button:nth-child(4)'); await esperar(2500);
  ok('chip de navegación enfoca', (await page2.$eval('#panel h2', (e) => e.textContent)) === 'DevOps');
  await page2.keyboard.press('Escape'); await esperar(2200);
  ok('Escape vuelve', !(await page2.evaluate(() => document.body.classList.contains('focused'))));
  await page2.close();
}
{
  const { page, errs } = await abrir(browser, { width: 1280, height: 720 }, '?planet=bases-de-datos');
  await esperar(3500);
  const h2 = await page.$eval('#panel h2', (e) => e.textContent).catch(() => '');
  ok('?planet= abre directo', h2 === 'Bases de datos', h2 + ' ' + errs.join('|'));
  await page.close();
}
{
  const { page } = await abrir(browser, { width: 1280, height: 720 }, '?planet=noexiste');
  await esperar(1500);
  ok('?planet inválido no rompe', !(await page.evaluate(() => document.body.classList.contains('focused'))));
  await page.close();
}
{
  const { page } = await abrir(browser, { width: 1280, height: 720 }, '', { reducido: true });
  const a = await page.evaluate(() => window.__space.planetas[0].grupo.position.toArray());
  await esperar(1200);
  const b = await page.evaluate(() => window.__space.planetas[0].grupo.position.toArray());
  ok('reduced-motion: planetas quietos', JSON.stringify(a) === JSON.stringify(b));
  await page.close();
}
{
  const { page } = await abrir(browser, { width: 1280, height: 720 });
  const a = await page.evaluate(() => window.__space.planetas[0].grupo.position.toArray());
  await esperar(1200);
  const b = await page.evaluate(() => window.__space.planetas[0].grupo.position.toArray());
  ok('movimiento normal: planetas orbitan', JSON.stringify(a) !== JSON.stringify(b));
  await page.close();
}
await browser.close();

// ---------- Móvil ----------
browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: base });
{
  const { page, errs } = await abrir(browser, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.screenshot({ path: `${SC}/m-over.png` });
  const p = await proyectar(page, 'planeta', [0]);
  await page.touchscreen.tap(p.x, p.y); await esperar(2500);
  const st = await page.evaluate(() => ({ f: document.body.classList.contains('focused'), sheetTop: document.getElementById('panel').getBoundingClientRect().top, vh: innerHeight, sw: document.documentElement.scrollWidth }));
  ok('móvil: tap enfoca (bottom sheet)', st.f && st.sheetTop > st.vh * 0.3 && st.sw <= 390, JSON.stringify(st) + errs.join('|'));
  await page.screenshot({ path: `${SC}/m-focus.png` });
  await page.close();
}
await browser.close();

// ---------- Sin WebGL ----------
browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--disable-gpu', '--disable-3d-apis', '--disable-webgl', '--disable-software-rasterizer'] });
{
  const { page } = await abrir(browser, { width: 900, height: 700 });
  await esperar(800);
  const vis = await page.evaluate(() => ({ fb: !document.getElementById('fallback').hidden, n: document.querySelectorAll('#fallback section').length }));
  ok('sin WebGL: lista alternativa', vis.fb && vis.n === 5, JSON.stringify(vis));
  await page.screenshot({ path: `${SC}/fallback.png` });
}
await browser.close();
console.log(res.join('\n'));
