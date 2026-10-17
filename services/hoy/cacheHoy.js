// Caché en memoria del reporte completo de "hoy" por municipio (5 min),
// más un candado para que consultas simultáneas al mismo municipio no
// dupliquen el trabajo mientras la primera todavía no termina.

const DURACION_CACHE_HOY_MS = 5 * 60 * 1000; // 5 minutos

const cache = new Map();
const enCurso = new Map(); // clave -> Promise de la consulta que ya está corriendo

function generarClave({ departamento, municipio }) {
  return `${departamento}|${municipio}`.toLowerCase();
}

function obtenerDeCacheHoy({ departamento, municipio }) {
  const clave = generarClave({ departamento, municipio });
  const entrada = cache.get(clave);

  if (!entrada) return null;

  const tiempoTranscurrido = Date.now() - entrada.timestamp;
  if (tiempoTranscurrido > DURACION_CACHE_HOY_MS) {
    cache.delete(clave);
    return null;
  }

  const segundosRestantes = Math.round((DURACION_CACHE_HOY_MS - tiempoTranscurrido) / 1000);
  console.log(`⚡ Reporte de "hoy" en caché (vigente ${segundosRestantes}s más) para: ${clave}`);

  return entrada.datos;
}

function guardarEnCacheHoy({ departamento, municipio }, datos) {
  const clave = generarClave({ departamento, municipio });
  cache.set(clave, { datos, timestamp: Date.now() });
  console.log(`💾 Reporte de "hoy" guardado en caché por 5 minutos: ${clave}`);
}

// Punto de entrada único para la rama "hoy": revisa caché, luego revisa si
// ya hay una consulta igual en curso (y se une a ella en vez de duplicarla),
// y solo si no hay ninguna de las dos ejecuta `tarea` de verdad.
//
// `tarea` debe devolver { respuesta, cacheable }. Si cacheable es false (por
// ejemplo, quedaron estaciones pendientes de reintento), la respuesta se
// entrega pero NO se guarda en caché, para que la próxima consulta reintente.
async function obtenerOEncolarHoy(datos, tarea) {
  const enCacheHoy = obtenerDeCacheHoy(datos);
  if (enCacheHoy) return enCacheHoy;

  const clave = generarClave(datos);
  const promesaExistente = enCurso.get(clave);
  if (promesaExistente) {
    console.log(`🕒 Ya hay una consulta de "hoy" en curso para ${clave}, esperando su resultado...`);
    return promesaExistente;
  }

  const promesa = (async () => {
    const { respuesta, cacheable } = await tarea();
    if (cacheable) {
      guardarEnCacheHoy(datos, respuesta);
    } else {
      console.log(`⚠️ Reporte de "hoy" incompleto (estaciones pendientes): NO se guarda en caché para ${clave}, la próxima consulta reintenta`);
    }
    return respuesta;
  })();

  enCurso.set(clave, promesa);
  try {
    return await promesa;
  } finally {
    enCurso.delete(clave);
  }
}

module.exports = { obtenerDeCacheHoy, guardarEnCacheHoy, obtenerOEncolarHoy };