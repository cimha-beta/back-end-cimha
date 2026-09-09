// Caché en memoria del reporte completo de "mañana" por municipio (1h).

const DURACION_CACHE_MANANA_MS = 60 * 60 * 1000; // 1 hora

const cache = new Map();

function generarClave({ departamento, municipio }) {
  return `${departamento}|${municipio}`.toLowerCase();
}

function obtenerDeCacheManana({ departamento, municipio }) {
  const clave = generarClave({ departamento, municipio });
  const entrada = cache.get(clave);

  if (!entrada) return null;

  const tiempoTranscurrido = Date.now() - entrada.timestamp;
  if (tiempoTranscurrido > DURACION_CACHE_MANANA_MS) {
    cache.delete(clave);
    return null;
  }

  const segundosRestantes = Math.round((DURACION_CACHE_MANANA_MS - tiempoTranscurrido) / 1000);
  console.log(`⚡ Reporte de "mañana" en caché (vigente ${segundosRestantes}s más) para: ${clave}`);

  return entrada.datos;
}

function guardarEnCacheManana({ departamento, municipio }, datos) {
  const clave = generarClave({ departamento, municipio });
  cache.set(clave, { datos, timestamp: Date.now() });
  console.log(`💾 Reporte de "mañana" guardado en caché por 1 hora: ${clave}`);
}

module.exports = { obtenerDeCacheManana, guardarEnCacheManana };