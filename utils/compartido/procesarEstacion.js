// Equivalente al nodo "Code (Ordenador)" de n8n.
// Toma la respuesta cruda del IDEAM + los datos de la estación desde
// Baserow, y calcula: nivel actual, precipitación actual, y tendencia
// (comparando con una lectura de ~3 horas atrás).

function parseFecha(fechaTexto) {
  const [fecha, hora] = fechaTexto.split(" ");
  const [anio, mes, dia] = fecha.split("/").map(Number);
  const [h, m] = hora.split(":").map(Number);
  return new Date(anio, mes - 1, dia, h, m);
}

function obtenerLecturasValidas(serie, campo) {
  return serie.filter(
    (item) => item.Fecha && item[campo] !== null && item[campo] !== undefined
  );
}

function procesarEstacion(datosIdeam, datosEstacion) {
  const serieNivel = datosIdeam.Hobs?.data || [];
  const seriePrecipitacion = datosIdeam.Pobs?.data || [];

  const lecturasNivel = obtenerLecturasValidas(serieNivel, "Hobs");
  const lecturasPrecipitacion = obtenerLecturasValidas(seriePrecipitacion, "Pobs");

  const nivelActual =
    lecturasNivel.length > 0
      ? lecturasNivel[lecturasNivel.length - 1].Hobs
      : "Sin información suficiente";

  const precipitacionActual =
    lecturasPrecipitacion.length > 0
      ? lecturasPrecipitacion[lecturasPrecipitacion.length - 1].Pobs
      : "-";

  let tendencia = "Sin información suficiente";

  if (lecturasNivel.length >= 2) {
    const ultima = lecturasNivel[lecturasNivel.length - 1];
    const fechaUltima = parseFecha(ultima.Fecha);
    const fechaObjetivo = new Date(fechaUltima.getTime() - 3 * 60 * 60 * 1000);

    let comparacion = null;
    for (let i = lecturasNivel.length - 2; i >= 0; i--) {
      if (parseFecha(lecturasNivel[i].Fecha) <= fechaObjetivo) {
        comparacion = lecturasNivel[i];
        break;
      }
    }
    if (!comparacion) {
      comparacion = lecturasNivel[lecturasNivel.length - 2];
    }

    const nivelA = parseFloat(ultima.Hobs);
    const nivelB = parseFloat(comparacion.Hobs);

    if (!isNaN(nivelA) && !isNaN(nivelB)) {
      const diferencia = nivelA - nivelB;
      if (Math.abs(diferencia) < 0.02) {
        tendencia = "estable";
      } else if (diferencia > 0) {
        tendencia = "En Aumento";
      } else {
        tendencia = "En Desenso";
      }
    }
  }

  return {
    municipio: datosEstacion.Municipio,
    nombre_estacion: datosEstacion.Nombre_Estacion,
    codigo_estacion: datosEstacion.Codigo_Estacion,
    fuente: datosEstacion.Fuente,
    orden_rio: datosEstacion.Orden_Rio,
    nivel_actual: nivelActual,
    precipitacion_actual: precipitacionActual,
    tendencia,
    riesgo_alertas: "-",
  };
}

module.exports = { procesarEstacion };