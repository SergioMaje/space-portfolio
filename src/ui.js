// Interfaz DOM: panel lateral, barra de planetas, tooltip y alternativa sin WebGL.
import { esUrlSegura } from './data.js';

/** Crea un elemento con texto seguro (nunca innerHTML con datos externos). */
function el(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  e.append(...hijos);
  return e;
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function createUI(data, { onSelect, onBack }) {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel'), cuerpo = $('panel-body'), nav = $('planet-nav');
  const tooltip = $('tooltip'), volver = $('back'), loader = $('loader');
  let ultimoFoco = null;

  // Barra de planetas
  const chips = new Map();
  for (const c of data.categories) {
    const b = el('button', { class: 'chip', type: 'button', 'data-id': c.id }, el('i'), c.name);
    b.style.setProperty('--c', c.color);
    b.addEventListener('click', () => onSelect(c.id));
    nav.append(b);
    chips.set(c.id, b);
  }

  volver.addEventListener('click', onBack);
  $('panel-close').addEventListener('click', onBack);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') onBack(); });

  function abrirPanel(cat) {
    ultimoFoco = document.activeElement;
    panel.style.setProperty('--accent', cat.color);
    cuerpo.replaceChildren(
      el('div', { class: 'p-head' },
        el('h2', { text: cat.name }),
        el('p', { text: `${plural(cat.skills.length, 'skill', 'skills')} · ${plural(cat.projects.length, 'proyecto', 'proyectos')}` })),
      el('h3', { class: 'p-sec', text: 'Skills (lunas)' }),
      el('ul', { class: 'skills' }, ...cat.skills.map((s, i) => {
        const barra = el('i');
        barra.dataset.nivel = s.level;
        barra.style.transitionDelay = `${150 + i * 90}ms`;
        const li = el('li', { 'data-skill': s.name },
          el('div', { class: 'row' }, el('span', { text: s.name }), el('span', { text: `${s.level}%` })),
          el('div', { class: 'bar', role: 'progressbar', 'aria-label': s.name, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': s.level }, barra));
        return li;
      })),
      el('h3', { class: 'p-sec', text: 'Proyectos (estaciones)' }),
      cat.projects.length
        ? el('div', { class: 'projects' }, ...cat.projects.map((p) =>
            el('article', { class: 'proj' },
              el('h4', { text: p.name }),
              p.description ? el('p', { text: p.description }) : '',
              esUrlSegura(p.url)
                ? el('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer', text: 'Abrir proyecto ↗' })
                : el('span', { class: 'muted', text: 'Enlace próximamente' }))))
        : el('p', { class: 'muted', text: 'Aún no hay proyectos destacados en esta categoría.' }));

    panel.classList.add('open');
    panel.removeAttribute('inert');
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    // Dispara la animación de las barras en el siguiente frame
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cuerpo.querySelectorAll('.bar i').forEach((b) => { b.style.width = `${b.dataset.nivel}%`; });
    }));
    document.body.classList.add('focused');
    volver.hidden = false;
    chips.forEach((b, id) => b.setAttribute('aria-current', String(id === cat.id)));
  }

  function cerrarPanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');
    document.body.classList.remove('focused');
    volver.hidden = true;
    chips.forEach((b) => b.removeAttribute('aria-current'));
    if (ultimoFoco?.focus && document.contains(ultimoFoco)) ultimoFoco.focus({ preventScroll: true });
  }

  function mostrarTooltip(titulo, detalle, x, y, color) {
    tooltip.replaceChildren(el('b', { text: titulo }), detalle ? el('small', { text: detalle }) : '');
    tooltip.style.setProperty('--tc', color ?? 'var(--accent)');
    tooltip.hidden = false;
    // Evita que se salga de la pantalla
    const w = tooltip.offsetWidth + 30, h = tooltip.offsetHeight + 30;
    tooltip.style.left = `${Math.min(x, innerWidth - w)}px`;
    tooltip.style.top = `${Math.min(y, innerHeight - h)}px`;
  }

  return {
    abrirPanel, cerrarPanel,
    mostrarTooltip,
    ocultarTooltip: () => { tooltip.hidden = true; },
    resaltarSkill(nombre) {
      cuerpo.querySelectorAll('li[data-skill]').forEach((li) => li.classList.toggle('hl', li.dataset.skill === nombre));
    },
    ocultarCarga() {
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 700);
    },
  };
}

/** Lista en HTML plano de todas las categorías (sin WebGL o como respaldo). */
export function mostrarAlternativa(data, motivo) {
  document.getElementById('loader')?.remove();
  for (const id of ['stage', 'planet-nav', 'panel', 'back', 'hint']) document.getElementById(id)?.remove();
  document.querySelector('.topbar')?.remove();
  const main = document.getElementById('fallback');
  main.replaceChildren(el('div', { class: 'wrap' },
    el('h1', { text: 'Skills y proyectos' }),
    el('p', { class: 'aviso', text: motivo }),
    ...data.categories.map((c) => {
      const sec = el('section', {},
        el('h2', { text: c.name }),
        el('ul', {}, ...c.skills.map((s) => el('li', { text: `${s.name}: ${s.level}%` }))));
      sec.style.setProperty('--c', c.color);
      if (c.projects.length) {
        sec.append(el('ul', {}, ...c.projects.map((p) => {
          const li = el('li');
          li.append(esUrlSegura(p.url) ? el('a', { href: p.url, rel: 'noopener noreferrer', text: p.name }) : el('strong', { text: p.name }));
          if (p.description) li.append(` — ${p.description}`);
          return li;
        })));
      }
      return sec;
    })));
  main.hidden = false;
}
