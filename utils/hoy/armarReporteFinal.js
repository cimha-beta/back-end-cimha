// Equivalente al nodo "Code in JavaScript4" de n8n.
// Junta clima + estaciones + Urrá + las 3 interpretaciones de la IA en un
// solo objeto final, listo para mostrar en el frontend.

const { obtenerFechaHoraActual } = require("../compartido/fechaHora");

function armarReporteFinal({
  departamento,
  municipio,
  clima,
  interpretacionClima,
  estaciones,
  interpretacionEstaciones,
  urra,
  interpretacionUrra,
}) {
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
    estacionesDescompuestas[`estacion_${numero}_tendencia`] = estacion.tendencia;
    estacionesDescompuestas[`estacion_${numero}_riesgo_alertas`] = estacion.riesgo_alertas;
  });

  return {
    fecha,
    hora,
    ubicacion: { departamento, municipio },
    clima: {
      estado_cielo: clima.estado_cielo,
      temperatura_actual: clima.temperatura_actual,
      temperatura_maxima: clima.temperatura_maxima,
      temperatura_minima: clima.temperatura_minima,
      sensacion_termica: clima.sensacion_termica,
      velocidad_viento: clima.velocidad_viento,
      probabilidad_lluvia: clima.probabilidad_lluvia,
      interpretacion: interpretacionClima,
    },
    estaciones: {
      cantidad: (estaciones.estaciones_detalle || []).length,
      ...estacionesDescompuestas,
      // Solo aparece cuando alguna estación no se pudo consultar bien.
      ...((estaciones.estaciones_pendientes || []).length > 0
        ? { pendientes_reintento: estaciones.estaciones_pendientes }
        : {}),
      interpretacion: interpretacionEstaciones,
    },
    urra: {
      hora_reporte: urra.hora,
      nivel_embalse: urra.nivel_embalse,
      caudal_entrante: urra.caudal_entrante,
      caudal_turbinas: urra.caudal_turbinas,
      caudal_rebosadero: urra.caudal_rebosadero,
      interpretacion: interpretacionUrra,
    },
  };
}

module.exports = { armarReporteFinal };