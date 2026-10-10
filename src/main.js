// Arranque: carga datos, comprueba WebGL y carga la escena de forma diferida.
import './style.css';
import { cargarDatos } from './data.js';
import { mostrarAlternativa } from './ui.js';

/** ¿Hay WebGL disponible? */
function hayWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function iniciar() {
  let datos;
  try {
    datos = await cargarDatos();
  } catch (e) {
    console.error(e);
    document.querySelector('#loader p').textContent = 'No se pudieron cargar los datos. Recarga la página.';
    document.querySelector('.spinner')?.remove();
    return;
  }

  if (!hayWebGL()) {
    mostrarAlternativa(datos, 'Tu navegador o dispositivo no admite WebGL, así que te muestro la versión en texto.');
    return;
  }

  try {
    // Three.js se descarga solo cuando hace falta (chunk aparte)
    const { crearEscena } = await import('./scene.js');
    const inicial = new URLSearchParams(location.search).get('planet');
    crearEscena({
      contenedor: document.getElementById('stage'),
      datos,
      planetaInicial: inicial,
      alFallar: (motivo) => mostrarAlternativa(datos, motivo),
    });
  } catch (e) {
    console.error(e);
    mostrarAlternativa(datos, 'No se pudo iniciar la simulación 3D, así que te muestro la versión en texto.');
  }
}

iniciar();
