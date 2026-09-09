// Caché en memoria de Urrá (1h) que se invalida si llega un file_id nuevo.

const DURACION_CACHE_URRA_MS = 60 * 60 * 1000; // 1 hora

let cacheUrra = null; // { fileId, datosUrra, interpretacionUrra, timestamp }

function obtenerUrraDeCache(fileIdActual) {
  if (!cacheUrra) return null;

  if (cacheUrra.fileId !== fileIdActual) {
    console.log("   ⚠️ Hay un reporte de Urrá más nuevo, la caché anterior ya no aplica");
    return null;
  }

  const tiempoTranscurrido = Date.now() - cacheUrra.timestamp;
  if (tiempoTranscurrido > DURACION_CACHE_URRA_MS) {
    return null;
  }

  const segundosRestantes = Math.round((DURACION_CACHE_URRA_MS - tiempoTranscurrido) / 1000);
  console.log(`   ⚡ Datos + interpretación de Urrá en caché (vigente ${segundosRestantes}s más)`);

  return {
    datosUrra: cacheUrra.datosUrra,
    interpretacionUrra: cacheUrra.interpretacionUrra,
  };
}

function guardarUrraEnCache(fileId, datosUrra, interpretacionUrra) {
  cacheUrra = { fileId, datosUrra, interpretacionUrra, timestamp: Date.now() };
  console.log("   💾 Datos + interpretación de Urrá guardados en caché por 1 hora");
}

module.exports = { obtenerUrraDeCache, guardarUrraEnCache };