// Caché en memoria del reporte completo de "semana" por municipio (3h).

const DURACION_CACHE_SEMANA_MS = 3 * 60 * 60 * 1000; // 3 horas

const cache = new Map();

function generarClave({ departamento, municipio }) {
  return `${departamento}|${municipio}`.toLowerCase();
}

function obtenerDeCacheSemana({ departamento, municipio }) {
  const clave = generarClave({ departamento, municipio });
  const entrada = cache.get(clave);

  if (!entrada) return null;

  const tiempoTranscurrido = Date.now() - entrada.timestamp;
  if (tiempoTranscurrido > DURACION_CACHE_SEMANA_MS) {
    cache.delete(clave);
    return null;
  }

  const minutosRestantes = Math.round((DURACION_CACHE_SEMANA_MS - tiempoTranscurrido) / 60000);
  console.log(`⚡ Reporte de "semana" en caché (vigente ${minutosRestantes} min más) para: ${clave}`);

  return entrada.datos;
}

function guardarEnCacheSemana({ departamento, municipio }, datos) {
  const clave = generarClave({ departamento, municipio });
  cache.set(clave, { datos, timestamp: Date.now() });
  console.log(`💾 Reporte de "semana" guardado en caché por 3 horas: ${clave}`);
}

module.exports = { obtenerDeCacheSemana, guardarEnCacheSemana };