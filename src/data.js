// Carga de skills.json: remoto (fuente única) con respaldo local.

// TODO: cambia si tu usuario o rama son distintos.
const URL_REMOTA = 'https://raw.githubusercontent.com/SergioMaje/SergioMaje/main/skills.json';
const URL_LOCAL = `${import.meta.env.BASE_URL}skills.json`;

/** Validación mínima: descarta datos remotos mal formados. */
function esValido(d) {
  return !!d && Array.isArray(d.categories) && d.categories.length > 0 &&
    d.categories.every((c) =>
      typeof c.id === 'string' && typeof c.name === 'string' && /^#[0-9a-f]{6}$/i.test(c.color) &&
      Array.isArray(c.skills) && c.skills.every((s) => typeof s.name === 'string' && Number.isFinite(s.level)) &&
      Array.isArray(c.projects));
}

async function pedir(url, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (!esValido(d)) throw new Error('formato inválido');
    return d;
  } finally {
    clearTimeout(timer);
  }
}

/** En desarrollo usa la copia local; en producción intenta el repo del perfil primero. */
export async function cargarDatos() {
  if (!import.meta.env.DEV) {
    try {
      return await pedir(URL_REMOTA, 3500);
    } catch (e) {
      console.info('[skills] usando copia local:', e.message);
    }
  }
  return pedir(URL_LOCAL, 8000);
}

/** Solo enlaces http(s); evita esquemas peligrosos si el JSON remoto cambia. */
export const esUrlSegura = (u) => /^https?:\/\//i.test(u ?? '');
