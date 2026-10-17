// Caché en memoria de datos IDEAM POR ESTACIÓN, con vencimiento en hora en
// punto (09:00, 10:00, 11:00...) y respaldo del último dato conocido.
//
// Cómo funciona:
//  - Cada estación se guarda individualmente, marcada con la hora calendario
//    en la que se guardó. Al cambiar la hora (en punto) todo lo anterior
//    deja de ser válido y se elimina.
//  - Como se cachea por estación (no por consulta), una consulta de 1, 2 o 3
//    estaciones reutiliza las mismas entradas.
//  - Si una estación no llegó bien, NO se guarda: la siguiente consulta
//    vuelve a intentar solo esa, y reutiliza las que ya estaban en caché.
//  - Si el IDEAM falla se usa el último dato conocido (que no vence por
//    tiempo), pero la estación se marca como "respaldo" para que quien llama
//    sepa que debe reintentar en la próxima consulta.
//  - Consultas simultáneas a la misma estación comparten una sola petición.

const { claveHoraActual, msHastaProximaHora } = require("../../utils/compartido/horaEnPunto");

const cacheVigente = new Map(); // codigoEstacion -> { datos, hora }
const cacheUltimoConocido = new Map(); // respaldo que no vence por tiempo
const consultasEnCurso = new Map(); // codigoEstacion -> Promise de la consulta en vivo

function esDatosValidos(datosIdeam) {
  if (!datosIdeam || typeof datosIdeam !== "object") return false;

  const serieNivel = datosIdeam.Hobs?.data;
  if (!Array.isArray(serieNivel) || serieNivel.length === 0) return false;

  return serieNivel.some(
    (item) => item.Fecha && item.Hobs !== null && item.Hobs !== undefined
  );
}

// Elimina todo lo guardado en una hora anterior a la actual.
function limpiarCacheVencido() {
  const horaActual = claveHoraActual();
  let eliminadas = 0;

  for (const [codigo, entrada] of cacheVigente) {
    if (entrada.hora !== horaActual) {
      cacheVigente.delete(codigo);
      eliminadas += 1;
    }
  }

  if (eliminadas > 0) {
    console.log(`   🗑️ Cambió la hora: se vencieron ${eliminadas} estación(es) del caché de estaciones`);
  }
}

// Limpieza automática a cada hora en punto. Es solo para liberar memoria a
// tiempo: la validez real se comprueba en cada lectura (limpiarCacheVencido),
// así que el caché es correcto aunque este temporizador se atrase.
function programarLimpiezaHoraEnPunto() {
  const temporizador = setTimeout(() => {
    limpiarCacheVencido();
    programarLimpiezaHoraEnPunto();
  }, msHastaProximaHora() + 50);

  // No mantiene vivo el proceso solo por este temporizador.
  if (typeof temporizador.unref === "function") temporizador.unref();
}
programarLimpiezaHoraEnPunto();

function obtenerEstacionDeCache(codigoEstacion) {
  limpiarCacheVencido();
  const entrada = cacheVigente.get(codigoEstacion);
  return entrada ? entrada.datos : null;
}

function guardarEstacionEnCache(codigoEstacion, datosIdeam) {
  if (!esDatosValidos(datosIdeam)) {
    console.log(`   ⚠️ Datos incompletos/erróneos del IDEAM para ${codigoEstacion}, NO se guarda en caché`);
    return false;
  }

  limpiarCacheVencido();
  cacheVigente.set(codigoEstacion, { datos: datosIdeam, hora: claveHoraActual() });
  cacheUltimoConocido.set(codigoEstacion, datosIdeam);
  return true;
}

// Obtiene el último dato conocido (fallback si el IDEAM falla).
function obtenerUltimoDatoConocido(codigoEstacion) {
  return cacheUltimoConocido.get(codigoEstacion) || null;
}

// Punto de entrada único para obtener los datos de UNA estación.
// `consultarFn(codigo)` es la función que consulta el IDEAM en vivo.
//
// Devuelve siempre { datosIdeam, origen } donde origen es:
//   "cache"     -> estaba en caché dentro de la hora actual
//   "vivo"      -> se consultó al IDEAM ahora y llegó bien (ya quedó en caché)
//   "respaldo"  -> el IDEAM falló; se devuelve el último dato conocido (viejo)
//                  -> PENDIENTE DE REINTENTO en la próxima consulta
//   "sin_datos" -> el IDEAM falló y no hay ningún respaldo (datosIdeam = null)
//                  -> PENDIENTE DE REINTENTO en la próxima consulta
async function obtenerEstacion(codigoEstacion, consultarFn) {
  const enCache = obtenerEstacionDeCache(codigoEstacion);
  if (enCache) return { datosIdeam: enCache, origen: "cache" };

  // Si otra consulta ya está pidiendo esta misma estación, esperamos su
  // resultado en vez de duplicar la petición al IDEAM.
  const consultaExistente = consultasEnCurso.get(codigoEstacion);
  if (consultaExistente) {
    console.log(`   🕒 Ya hay una consulta en curso para ${codigoEstacion}, esperando su resultado...`);
    return consultaExistente;
  }

  // Esta promesa nunca rechaza: siempre resuelve con { datosIdeam, origen }.
  const promesa = (async () => {
    try {
      const datos = await consultarFn(codigoEstacion);
      if (guardarEstacionEnCache(codigoEstacion, datos)) {
        return { datosIdeam: datos, origen: "vivo" };
      }
    } catch (error) {
      console.error(`   ❌ Falló la consulta en vivo de ${codigoEstacion}:`, error.message);
    }

    const respaldo = obtenerUltimoDatoConocido(codigoEstacion);
    if (respaldo) return { datosIdeam: respaldo, origen: "respaldo" };

    return { datosIdeam: null, origen: "sin_datos" };
  })();

  consultasEnCurso.set(codigoEstacion, promesa);
  try {
    return await promesa;
  } finally {
    consultasEnCurso.delete(codigoEstacion);
  }
}

module.exports = {
  obtenerEstacion,
  obtenerEstacionDeCache,
  guardarEstacionEnCache,
  obtenerUltimoDatoConocido,
  esDatosValidos,
};