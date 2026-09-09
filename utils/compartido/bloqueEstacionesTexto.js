// Arma el bloque de texto por estación (nivel, precipitación, tendencia
// actual y proyección de 12h) para usar dentro de los prompts de IA.
// Compartido entre "mañana" y "semana" (ambos incluyen predicción).

function construirBloqueEstaciones(estacionesDetalle) {
  let bloque = "";

  for (const d of estacionesDetalle) {
    if (!d.nombre_estacion) continue;

    bloque += `\n--- ESTACIÓN ${d.nombre_estacion.toUpperCase()} ---\n`;
    bloque += `Nivel actual: ${d.nivel_actual}\n`;
    bloque += `Precipitación actual: ${d.precipitacion_actual}\n`;
    bloque += `Tendencia actual: ${d.tendencia}\n`;

    if (d.prediccion && d.prediccion.prediccion_disponible) {
      bloque += `Proyección para las próximas 12 horas (basada solo en el comportamiento reciente del río, sin contar lluvia futura ni cambios de Urrá): ${d.prediccion.tendencia_proyectada}, cambio ${d.prediccion.magnitud_proyectada}\n`;
    } else {
      bloque += `Proyección para las próximas 12 horas: ${d.prediccion ? d.prediccion.mensaje : "Sin información suficiente para predecir cambios"}\n`;
    }
  }

  return bloque;
}

module.exports = { construirBloqueEstaciones };