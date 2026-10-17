// Equivalente al nodo "Code in JavaScript3" de n8n.
// Junta todas las estaciones ya procesadas en un solo resumen: arma el
// texto plano (para la IA, en la próxima etapa) y calcula cuál estación
// es la "más cercana" (la de mayor orden_rio).

function agregarEstaciones(estacionesProcesadas) {
  let bloqueTexto = "";

  for (const d of estacionesProcesadas) {
    if (!d.nombre_estacion) continue;

    bloqueTexto += `\n--- ESTACIÓN ${d.nombre_estacion.toUpperCase()} ---\n`;
    bloqueTexto += `Nivel actual: ${d.nivel_actual}\n`;
    bloqueTexto += `Precipitación actual: ${d.precipitacion_actual}\n`;
    bloqueTexto += `Tendencia: ${d.tendencia}\n`;
    if (d.dato_desactualizado) {
      bloqueTexto += `Nota: dato desactualizado (no se pudo consultar el IDEAM en este momento; es la última lectura conocida)\n`;
    }
  }

  const estacionesValidas = estacionesProcesadas.filter(
    (d) => d.nombre_estacion && d.orden_rio !== undefined
  );

  if (estacionesValidas.length === 0) {
    throw new Error(
      "Ninguna estación procesada tiene los campos esperados (nombre_estacion, orden_rio)."
    );
  }

  const estacionMasCercana = estacionesValidas.reduce((max, d) =>
    Number(d.orden_rio) > Number(max.orden_rio) ? d : max
  );

  return {
    estaciones_texto: bloqueTexto,
    estaciones_detalle: estacionesValidas,
    tendencia_estacion_cercana: estacionMasCercana.tendencia,
    nombre_estacion_cercana: estacionMasCercana.nombre_estacion,
    cantidad_estaciones: estacionesValidas.length,
  };
}

module.exports = { agregarEstaciones };