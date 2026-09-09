// Caché en memoria de datos IDEAM con vencimiento en lote (1h) y fallback de último dato conocido.

const DURACION_CACHE_ESTACION_MS = 60 * 60 * 1000; // 1 hora

let cacheVigente = new Map(); // codigoEstacion -> datosIdeam
let inicioLote = null; // timestamp de la primera estación del lote actual
const cacheUltimoConocido = new Map(); // respaldo que no vence por tiempo

function esDatosValidos(datosIdeam) {
  if (!datosIdeam || typeof datosIdeam !== "object") return false;

  const serieNivel = datosIdeam.Hobs?.data;
  if (!Array.isArray(serieNivel) || serieNivel.length === 0) return false;

  return serieNivel.some(
    (item) => item.Fecha && item.Hobs !== null && item.Hobs !== undefined
  );
}

function verificarYLimpiarLoteSiVencio() {
  if (inicioLote === null) return;

  const tiempoTranscurrido = Date.now() - inicioLote;
  if (tiempoTranscurrido > DURACION_CACHE_ESTACION_MS) {
    console.log(
      `   🗑️ El lote de estaciones en caché cumplió 1 hora (marcado por la primera que entró) — se vencen las ${cacheVigente.size} estación(es) juntas`
    );
    cacheVigente.clear();
    inicioLote = null;
  }
}

function obtenerEstacionDeCache(codigoEstacion) {
  verificarYLimpiarLoteSiVencio();
  return cacheVigente.get(codigoEstacion) || null;
}

function guardarEstacionEnCache(codigoEstacion, datosIdeam) {
  if (!esDatosValidos(datosIdeam)) {
    console.log(`   ⚠️ Datos incompletos/erróneos del IDEAM para ${codigoEstacion}, NO se actualiza la caché`);
    return false;
  }

  // Valida si el lote actual ya venció antes de decidir si arranca uno nuevo.
  verificarYLimpiarLoteSiVencio();

  if (inicioLote === null) {
    inicioLote = Date.now();
    console.log(`   🆕 Nuevo lote de caché de estaciones iniciado (vence en 1 hora desde ahora)`);
  }

  cacheVigente.set(codigoEstacion, datosIdeam);
  cacheUltimoConocido.set(codigoEstacion, datosIdeam);
  return true;
}

// Obtiene el último dato conocido (fallback si el IDEAM falla).
function obtenerUltimoDatoConocido(codigoEstacion) {
  return cacheUltimoConocido.get(codigoEstacion) || null;
}

module.exports = {
  obtenerEstacionDeCache,
  guardarEstacionEnCache,
  obtenerUltimoDatoConocido,
  esDatosValidos,
};