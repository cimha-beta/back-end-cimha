// Aplica la misma técnica de regresión lineal (usada para las estaciones)
// a la probabilidad de lluvia de los 6 días del pronóstico semanal, para
// detectar si la tendencia de lluvia va en aumento o en disminución
// conforme avanza la semana.
//
// Esto es una señal ADICIONAL para que la IA razone sobre el río — NO es
// una predicción del nivel del río a 6 días. Ese nivel de certeza no es
// razonable sin datos reales de lluvia futura y de las descargas de Urrá.

const { calcularPendiente } = require("../compartido/regresionLineal");

const UMBRAL_ESTABLE_PORCENTAJE_POR_DIA = 2;

function analizarTendenciaLluvia(diasSemana) {
  if (!diasSemana || diasSemana.length < 2) {
    return {
      tendencia_disponible: false,
      mensaje: "Sin información suficiente para analizar la tendencia de lluvia",
    };
  }

  const puntos = diasSemana.map((dia, index) => ({
    x: index, // día 0, 1, 2... (día siguiente a hoy, y así sucesivamente)
    y: dia.probabilidad_lluvia,
  }));

  const pendiente = calcularPendiente(puntos); // % de probabilidad de lluvia por día
  const magnitudAbsoluta = Math.abs(pendiente);

  let direccion;
  if (magnitudAbsoluta < UMBRAL_ESTABLE_PORCENTAJE_POR_DIA) {
    direccion = "estable";
  } else if (pendiente > 0) {
    direccion = "en aumento";
  } else {
    direccion = "en disminución";
  }

  let magnitud;
  if (magnitudAbsoluta < 5) {
    magnitud = "leve";
  } else if (magnitudAbsoluta < 10) {
    magnitud = "moderada";
  } else {
    magnitud = "marcada";
  }

  return {
    tendencia_disponible: true,
    tendencia_lluvia: direccion,
    magnitud_tendencia_lluvia: magnitud,
  };
}

module.exports = { analizarTendenciaLluvia };