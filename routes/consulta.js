const express = require("express");
const router = express.Router();

const { etiquetarPeticion } = require("../utils/compartido/logContexto");

const { normalizarConsulta } = require("../utils/compartido/normalizarConsulta");
const {
  buscarUbicacionGeografica,
  buscarOrdenEstacion,
  buscarEstacionesPorOrden,
  buscarUltimoUrraBot,
} = require("../services/compartido/baserow");
const { consultarClimaHoy } = require("../services/hoy/openMeteo");
const { procesarClimaHoy } = require("../utils/hoy/procesarClima");
const { consultarIdeam } = require("../services/compartido/ideam");
const { procesarEstacion } = require("../utils/compartido/procesarEstacion");
const { agregarEstaciones } = require("../utils/compartido/agregarEstaciones");
const { descargarPdfUrra } = require("../services/hoy/googleDrive");
const { procesarPdfUrra } = require("../utils/hoy/procesarPdfUrra");
const { llamarGroq } = require("../services/compartido/groq");
const {
  construirPromptClima,
  construirPromptEstaciones,
  construirPromptUrra,
} = require("../utils/hoy/promptsIA");
const { parsearRespuestaGroq, parsearListaGroq } = require("../utils/compartido/parsearRespuestaGroq");
const { armarReporteFinal } = require("../utils/hoy/armarReporteFinal");
const { obtenerEstacion } = require("../services/compartido/cacheEstaciones");
const { obtenerUrraDeCache, guardarUrraEnCache } = require("../services/hoy/cacheUrra");
const { obtenerOEncolarHoy } = require("../services/hoy/cacheHoy");
const { generarPrediccionEstacion } = require("../utils/manana/generarPrediccion");
const { consultarClimaManana } = require("../services/manana/openMeteo2");
const { procesarClimaManana } = require("../utils/manana/procesarClima");
const { construirPromptClimaYRio } = require("../utils/manana/promptsManana");
const { armarReporteFinal: armarReporteFinalManana } = require("../utils/manana/armarReporteFinal");
const { obtenerDeCacheManana, guardarEnCacheManana } = require("../services/manana/cacheManana");
const { consultarClimaSemana } = require("../services/semana/openMeteo");
const { procesarClimaSemana } = require("../utils/semana/procesarClima");
const { analizarTendenciaLluvia } = require("../utils/semana/analizarTendenciaClimatica");
const { construirPromptClimaYRioSemana } = require("../utils/semana/promptsSemana");
const { armarReporteFinal: armarReporteFinalSemana } = require("../utils/semana/armarReporteFinal");
const { obtenerDeCacheSemana, guardarEnCacheSemana } = require("../services/semana/cacheSemana");

// Trae y procesa TODAS las estaciones relevantes para un departamento/municipio.
// Cada estación individual usa su propia caché, que vence en hora en punto
// (útil porque varias consultas de municipios distintos pueden compartir las
// mismas estaciones).
//
// Si una estación no llega bien del IDEAM queda como PENDIENTE DE REINTENTO:
//  - con dato viejo de respaldo -> se muestra marcada como desactualizada
//  - sin ningún dato            -> se omite del reporte
// En ambos casos el resumen devuelve completo = false, y quien llama NO debe
// guardar el reporte en caché, para que la próxima consulta reintente solo
// las estaciones pendientes (las que sí llegaron siguen en caché).
async function obtenerResumenEstaciones({ departamento, municipio }, { incluirPrediccion = false } = {}) {
  console.log("🌊 Buscando orden en el río para", municipio, departamento);
  const ordenInfo = await buscarOrdenEstacion({ departamento, municipio });
  console.log("✅ Orden consultado:", ordenInfo.orden_consultado);

  console.log("🌊 Buscando estaciones con orden <=", ordenInfo.orden_consultado);
  const estaciones = await buscarEstacionesPorOrden({
    orden_consultado: ordenInfo.orden_consultado,
  });
  console.log(`✅ Se encontraron ${estaciones.length} estación(es)`);

  const estacionesProcesadas = [];
  const estacionesPendientes = [];

  for (const estacion of estaciones) {
    const codigo = estacion.Codigo_Estacion;
    console.log(`   ↳ Estación: ${estacion.Nombre_Estacion} (${codigo})`);

    const { datosIdeam, origen } = await obtenerEstacion(codigo, consultarIdeam);

    if (origen === "cache") {
      console.log(`   ⚡ Datos del IDEAM en caché para ${estacion.Nombre_Estacion}`);
    } else if (origen === "vivo") {
      console.log(`   🌐 Datos del IDEAM obtenidos en vivo para ${estacion.Nombre_Estacion}`);
    } else if (origen === "respaldo") {
      console.log(`   🔁 Usando el último dato conocido (posiblemente desactualizado) para ${estacion.Nombre_Estacion} — queda pendiente de reintento`);
      estacionesPendientes.push({
        codigo_estacion: codigo,
        nombre_estacion: estacion.Nombre_Estacion,
        motivo: "dato_desactualizado",
      });
    } else {
      console.error(`   ⛔ No hay ningún dato para ${estacion.Nombre_Estacion}, se omite — queda pendiente de reintento`);
      estacionesPendientes.push({
        codigo_estacion: codigo,
        nombre_estacion: estacion.Nombre_Estacion,
        motivo: "sin_datos",
      });
      continue;
    }

    const procesada = procesarEstacion(datosIdeam, estacion);
    if (origen === "respaldo") procesada.dato_desactualizado = true;

    if (incluirPrediccion) {
      procesada.prediccion = generarPrediccionEstacion(datosIdeam);
      if (procesada.prediccion.prediccion_disponible) {
        console.log(
          `   🔮 Predicción 12h para ${procesada.nombre_estacion}: ${procesada.prediccion.tendencia_proyectada} (${procesada.prediccion.magnitud_proyectada})`
        );
      } else {
        console.log(`   🔮 Predicción no disponible para ${procesada.nombre_estacion}: ${procesada.prediccion.mensaje}`);
      }
    }

    console.log(`   ✅ ${procesada.nombre_estacion}: nivel ${procesada.nivel_actual}, tendencia ${procesada.tendencia}`);
    estacionesProcesadas.push(procesada);
  }

  const resumen = agregarEstaciones(estacionesProcesadas);
  resumen.cantidad_esperada = estaciones.length;
  resumen.estaciones_pendientes = estacionesPendientes;
  resumen.completo = estacionesPendientes.length === 0;

  console.log("📋 Resumen de estaciones:", {
    estacion_cercana: resumen.nombre_estacion_cercana,
    tendencia: resumen.tendencia_estacion_cercana,
    cantidad: resumen.cantidad_estaciones,
    esperadas: resumen.cantidad_esperada,
    pendientes: estacionesPendientes.length,
  });

  return resumen;
}

// Trae el PDF más reciente de Urrá y extrae sus datos (con caché de 1 hora).
async function obtenerDatosUrraCrudos() {
  console.log("📄 Buscando el último registro de UrraBot en Baserow...");
  const registro = await buscarUltimoUrraBot();

  if (!registro) {
    throw new Error("No hay registros de UrraBot en Baserow.");
  }
  console.log("✅ Registro encontrado, file_id:", registro.file_id);

  return { fileId: registro.file_id };
}

async function descargarYProcesarPdfUrra(fileId) {
  console.log("⬇️ Descargando el PDF desde Google Drive...");
  const bufferPdf = await descargarPdfUrra(fileId);
  console.log(`✅ PDF descargado (${bufferPdf.length} bytes)`);

  console.log("📖 Extrayendo datos de la tabla del PDF...");
  const datosUrra = await procesarPdfUrra(bufferPdf);
  console.log("✅ Datos de Urrá extraídos:", datosUrra);

  return datosUrra;
}

async function interpretarConGroq({ tipo, promptData }) {
  console.log(`🤖 Consultando IA para ${tipo}...`);
  const respuesta = await llamarGroq({
    systemPrompt: promptData.systemPrompt,
    userPrompt: promptData.userPrompt,
  });
  return respuesta;
}

// Hace todo el trabajo real de una consulta "hoy": Open-Meteo, estaciones,
// Urrá y las 2-3 llamadas a Groq. Se llama solo cuando no hay caché ni una
// consulta igual ya en curso (ver obtenerOEncolarHoy en cacheHoy.js).
async function procesarConsultaHoy(datos, ubicacion) {
  console.log("🌤️ Consultando Open-Meteo...");
  const climaCrudo = await consultarClimaHoy({
    latitud: ubicacion.Latitud,
    longitud: ubicacion.Longitud,
  });
  const clima = procesarClimaHoy(climaCrudo);
  console.log("✅ Clima procesado:", clima);

  const estacionesResumen = await obtenerResumenEstaciones(datos);

  // --- Urrá: primero vemos si ya tenemos datos + interpretación en caché ---
  const { fileId } = await obtenerDatosUrraCrudos();
  let cacheUrraExistente = obtenerUrraDeCache(fileId);

  let datosUrra;
  let interpretacionUrra;

  if (cacheUrraExistente) {
    datosUrra = cacheUrraExistente.datosUrra;
    interpretacionUrra = cacheUrraExistente.interpretacionUrra;
  } else {
    datosUrra = await descargarYProcesarPdfUrra(fileId);
  }

  // --- Interpretaciones de clima y estaciones (siempre se calculan) ---
  const promptClima = construirPromptClima({
    departamento: datos.departamento,
    municipio: datos.municipio,
    clima,
  });
  const respuestaClima = await interpretarConGroq({ tipo: "el clima", promptData: promptClima });
  const interpretacionClima = parsearRespuestaGroq(respuestaClima, "interpretacion_clima");
  const recomendacionesClima = parsearListaGroq(respuestaClima, "recomendaciones");
  console.log("✅ Interpretación de clima:", interpretacionClima);
  console.log("✅ Recomendaciones de clima:", recomendacionesClima);

  const promptEstaciones = construirPromptEstaciones({
    departamento: datos.departamento,
    municipio: datos.municipio,
    estaciones: estacionesResumen,
  });
  const respuestaEstaciones = await interpretarConGroq({ tipo: "las estaciones", promptData: promptEstaciones });
  const interpretacionEstaciones = parsearRespuestaGroq(respuestaEstaciones, "interpretacion_estaciones");
  console.log("✅ Interpretación de estaciones:", interpretacionEstaciones);

  // --- Interpretación de Urrá: solo si NO vino ya de la caché ---
  if (!cacheUrraExistente) {
    const promptUrra = construirPromptUrra({
      departamento: datos.departamento,
      municipio: datos.municipio,
      urra: datosUrra,
    });
    const respuestaUrra = await interpretarConGroq({ tipo: "Urrá", promptData: promptUrra });
    interpretacionUrra = parsearRespuestaGroq(respuestaUrra, "interpretacion_urra");
    console.log("✅ Interpretación de Urrá:", interpretacionUrra);

    guardarUrraEnCache(fileId, datosUrra, interpretacionUrra);
  }

  const reporteFinal = armarReporteFinal({
    departamento: datos.departamento,
    municipio: datos.municipio,
    clima,
    interpretacionClima,
    recomendacionesClima,
    estaciones: estacionesResumen,
    interpretacionEstaciones,
    urra: datosUrra,
    interpretacionUrra,
  });

  console.log("🎉 Reporte final armado");

  // cacheable = false si quedó alguna estación pendiente de reintento
  // (ver obtenerOEncolarHoy en cacheHoy.js).
  return {
    respuesta: { ok: true, reporte: reporteFinal },
    cacheable: estacionesResumen.completo,
  };
}

// Equivalente a: Webhook -> Code -> Ubicación Geografica -> Router
router.post("/consulta-coordenadas", async (req, res) => {
  console.log("📥 Llegó una consulta:", req.body);
  const inicioCronometroTemporal = Date.now(); // TEMPORAL: quitar cuando ya no se necesite medir tiempos
  let datos;

  try {
    datos = normalizarConsulta(req.body || {});
    etiquetarPeticion(`${datos.municipio} · ${datos.consulta}`);
  } catch (error) {
    return res.status(400).json({ ok: false, mensaje: error.message });
  }

  try {
    const ubicacion = await buscarUbicacionGeografica(datos);

    if (!ubicacion) {
      return res.status(404).json({
        ok: false,
        mensaje: `No se encontró "${datos.municipio}, ${datos.departamento}" en la base de ubicaciones.`,
      });
    }

    if (datos.consulta === "hoy") {
      const respuestaHoy = await obtenerOEncolarHoy(datos, () => procesarConsultaHoy(datos, ubicacion));
      return res.status(200).json(respuestaHoy);
    }

    if (datos.consulta === "mañana") {
      const enCacheManana = obtenerDeCacheManana(datos);
      if (enCacheManana) {
        return res.status(200).json(enCacheManana);
      }

      console.log("🌤️ Consultando Open-Meteo (pronóstico de mañana)...");
      const climaCrudo = await consultarClimaManana({
        latitud: ubicacion.Latitud,
        longitud: ubicacion.Longitud,
      });
      const clima = procesarClimaManana(climaCrudo);
      console.log("✅ Clima de mañana procesado:", clima);

      // Estaciones CON predicción de 12h activada (a diferencia de "hoy")
      const estacionesResumen = await obtenerResumenEstaciones(datos, { incluirPrediccion: true });

      const promptClimaYRio = construirPromptClimaYRio({
        departamento: datos.departamento,
        municipio: datos.municipio,
        clima,
        estaciones: estacionesResumen,
      });
      const respuestaIA = await interpretarConGroq({ tipo: "clima y río (mañana)", promptData: promptClimaYRio });
      const interpretacion = parsearRespuestaGroq(respuestaIA, "interpretacion");
      const recomendaciones = parsearListaGroq(respuestaIA, "recomendaciones");
      console.log("✅ Interpretación combinada (mañana):", interpretacion);
      console.log("✅ Recomendaciones (mañana):", recomendaciones);

      const reporteFinalManana = armarReporteFinalManana({
        departamento: datos.departamento,
        municipio: datos.municipio,
        clima,
        estaciones: estacionesResumen,
        interpretacion,
        recomendaciones,
      });

      console.log("🎉 Reporte de mañana armado");

      const respuestaManana = { ok: true, reporte: reporteFinalManana };
      if (estacionesResumen.completo) {
        guardarEnCacheManana(datos, respuestaManana);
      } else {
        console.log(
          `⚠️ Reporte de "mañana" incompleto (${estacionesResumen.estaciones_pendientes.length} estación(es) pendiente(s)): NO se guarda en caché, la próxima consulta reintenta`
        );
      }

      return res.status(200).json(respuestaManana);
    }

    if (datos.consulta === "semana") {
      const enCacheSemana = obtenerDeCacheSemana(datos);
      if (enCacheSemana) {
        return res.status(200).json(enCacheSemana);
      }

      console.log("🌤️ Consultando Open-Meteo (pronóstico de la semana)...");
      const climaCrudo = await consultarClimaSemana({
        latitud: ubicacion.Latitud,
        longitud: ubicacion.Longitud,
      });
      const diasSemana = procesarClimaSemana(climaCrudo);
      console.log(`✅ Pronóstico de ${diasSemana.length} días procesado`);

      // Muestra el detalle del clima de los 6 días, día por día por fecha.
      console.log("📅 Detalle del clima día a día:");
      diasSemana.forEach((dia) => {
        console.log(`\n──────────── DÍA ${dia.fecha} ────────────`);
        console.log(`   Estado del cielo: ${dia.estado_cielo}`);
        console.log(`   Sensación térmica: ${dia.posible_sensacion_termica}`);
        console.log(`   Temperatura mínima: ${dia.temperatura_minima} °C`);
        console.log(`   Temperatura máxima: ${dia.temperatura_maxima} °C`);
        console.log(`   Velocidad del viento: ${dia.velocidad_viento} km/h`);
        console.log(`   Probabilidad de lluvia: ${dia.probabilidad_lluvia} %`);
      });

      const tendenciaLluvia = analizarTendenciaLluvia(diasSemana);
      if (tendenciaLluvia.tendencia_disponible) {
        console.log(
          `🔮 Tendencia de lluvia en la semana: ${tendenciaLluvia.tendencia_lluvia} (${tendenciaLluvia.magnitud_tendencia_lluvia})`
        );
      } else {
        console.log(`🔮 Tendencia de lluvia: ${tendenciaLluvia.mensaje}`);
      }

      // Estaciones CON predicción de 12h (igual que en "mañana")
      const estacionesResumen = await obtenerResumenEstaciones(datos, { incluirPrediccion: true });

      const promptSemana = construirPromptClimaYRioSemana({
        departamento: datos.departamento,
        municipio: datos.municipio,
        diasSemana,
        tendenciaLluvia,
        estaciones: estacionesResumen,
      });
      const respuestaIA = await interpretarConGroq({ tipo: "clima y río (semana)", promptData: promptSemana });
      const interpretacion = parsearRespuestaGroq(respuestaIA, "interpretacion");
      const recomendaciones = parsearListaGroq(respuestaIA, "recomendaciones");
      console.log("✅ Interpretación combinada (semana):", interpretacion);
      console.log("✅ Recomendaciones (semana):", recomendaciones);

      const reporteFinalSemana = armarReporteFinalSemana({
        departamento: datos.departamento,
        municipio: datos.municipio,
        diasSemana,
        estaciones: estacionesResumen,
        interpretacion,
        recomendaciones,
      });

      console.log("🎉 Reporte de semana armado");

      const respuestaSemana = { ok: true, reporte: reporteFinalSemana };
      if (estacionesResumen.completo) {
        guardarEnCacheSemana(datos, respuestaSemana);
      } else {
        console.log(
          `⚠️ Reporte de "semana" incompleto (${estacionesResumen.estaciones_pendientes.length} estación(es) pendiente(s)): NO se guarda en caché, la próxima consulta reintenta`
        );
      }

      return res.status(200).json(respuestaSemana);
    }

    // No debería llegar aquí (normalizarConsulta ya valida hoy/mañana/semana)
    return res.status(400).json({ ok: false, mensaje: "Tipo de consulta no reconocido." });
  } catch (error) {
    console.error("Error al procesar la consulta de coordenadas:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo procesar la consulta. Intenta de nuevo más tarde.",
    });
  }
});

module.exports = router;