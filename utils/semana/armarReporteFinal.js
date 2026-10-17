// Arma el reporte final de la rama "semana": pronóstico de 6 días +
// estaciones (con predicción de 12h) + UNA sola interpretación combinada.
//
// ORDEN: 1º clima (arreglo de 6 días), 2º estaciones (IDEAM), 3º interpretación.

const { obtenerFechaHoraActual } = require("../compartido/fechaHora");

function armarReporteFinal({ departamento, municipio, diasSemana, estaciones, interpretacion, recomendaciones }) {
  const { fecha, hora } = obtenerFechaHoraActual();

  const estacionesDescompuestas = {};
  (estaciones.estaciones_detalle || []).forEach((estacion, index) => {
    const numero = index + 1;
    estacionesDescompuestas[`estacion_${numero}_nombre`] = estacion.nombre_estacion;
    if (estacion.dato_desactualizado) {
      estacionesDescompuestas[`estacion_${numero}_desactualizada`] = true;
    }
    estacionesDescompuestas[`estacion_${numero}_municipio`] = estacion.municipio;
    estacionesDescompuestas[`estacion_${numero}_nivel_actual`] = estacion.nivel_actual;
    estacionesDescompuestas[`estacion_${numero}_precipitacion_actual`] = estacion.precipitacion_actual;
    estacionesDescompuestas[`estacion_${numero}_tendencia_actual`] = estacion.tendencia;

    if (estacion.prediccion && estacion.prediccion.prediccion_disponible) {
      estacionesDescompuestas[`estacion_${numero}_prediccion_12h`] = estacion.prediccion.tendencia_proyectada;
      estacionesDescompuestas[`estacion_${numero}_magnitud_prediccion`] = estacion.prediccion.magnitud_proyectada;
    } else {
      estacionesDescompuestas[`estacion_${numero}_prediccion_12h`] =
        estacion.prediccion?.mensaje || "Sin información suficiente para predecir cambios";
    }
  });

  return {
    fecha,
    hora,
    ubicacion: { departamento, municipio },

    // 1º: clima (6 días)
    clima: diasSemana.map((dia) => ({
      fecha: dia.fecha,
      estado_cielo: dia.estado_cielo,
      posible_sensacion_termica: dia.posible_sensacion_termica,
      temperatura_minima: dia.temperatura_minima,
      temperatura_maxima: dia.temperatura_maxima,
      velocidad_viento: dia.velocidad_viento,
      probabilidad_lluvia: dia.probabilidad_lluvia,
    })),

    // 2º: estaciones (IDEAM)
    estaciones: {
      cantidad: (estaciones.estaciones_detalle || []).length,
      ...estacionesDescompuestas,
      // Solo aparece cuando alguna estación no se pudo consultar bien.
      ...((estaciones.estaciones_pendientes || []).length > 0
        ? { pendientes_reintento: estaciones.estaciones_pendientes }
        : {}),
    },

    // 3º: interpretación (una sola, combinando semana + río)
    interpretacion,

    // 4º: recomendaciones (4 puntos, basadas solo en el clima)
    recomendaciones: recomendaciones || [],
  };
}

module.exports = { armarReporteFinal };