// Genera una predicción simple del comportamiento del río para las
// próximas 12 horas, basada ÚNICAMENTE en la inercia reciente de las
// lecturas de nivel (Hobs) de una estación.
//
// MÉTODO: regresión lineal simple (mínimos cuadrados) sobre los puntos
// (horas transcurridas, nivel). La pendiente de esa línea es la base de
// la proyección.
//
// VENTANA ADAPTABLE: idealmente usamos solo las últimas 12 horas. Pero
// algunas estaciones del IDEAM reportan cada 6-12 horas (no cada hora), así
// que a ciertas horas del día una ventana estricta de 12h puede quedar con
// 0 o 1 puntos válidos. Para no perder la predicción en esos casos, si 12h
// no alcanza el mínimo de 2 puntos, ampliamos a 24h, y si tampoco, a 48h.
// El horizonte de la PROYECCIÓN sigue siendo siempre 12h hacia adelante,
// sin importar qué tan ancha tuvo que ser la ventana histórica usada.
//
// LIMITACIÓN IMPORTANTE (y a propósito): esto NO considera lluvia futura
// ni decisiones de la hidroeléctrica Urrá (aumentar o reducir caudal). Es
// una proyección estadística de tendencia reciente, no un modelo
// hidrológico completo. Si esas variables cambian, el comportamiento real
// del río puede diferir de lo proyectado.

const { calcularPendiente } = require("../compartido/regresionLineal");

const VENTANAS_A_INTENTAR_HORAS = [12, 24, 48];
const HORIZONTE_PROYECCION_HORAS = 12;
const MINIMO_PUNTOS_REQUERIDOS = 2;
const UMBRAL_ESTABLE_M = 0.02; // mismo umbral que usamos para la tendencia actual, por metro/hora

function parseFecha(fechaTexto) {
  const [fecha, hora] = fechaTexto.split(" ");
  const [anio, mes, dia] = fecha.split("/").map(Number);
  const [h, m] = hora.split(":").map(Number);
  return new Date(anio, mes - 1, dia, h, m);
}

function filtrarPorVentana(serieNivel, horasVentana) {
  const ahora = Date.now();
  const limiteInferior = ahora - horasVentana * 60 * 60 * 1000;

  return serieNivel
    .filter((item) => item.Fecha && item.Hobs !== null && item.Hobs !== undefined)
    .map((item) => ({ fecha: parseFecha(item.Fecha), nivel: parseFloat(item.Hobs) }))
    .filter(
      (item) => !isNaN(item.nivel) && item.fecha.getTime() >= limiteInferior && item.fecha.getTime() <= ahora
    )
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

// Prueba ventanas cada vez más anchas hasta conseguir el mínimo de puntos.
function obtenerPuntosParaPrediccion(serieNivel) {
  for (const horas of VENTANAS_A_INTENTAR_HORAS) {
    const puntos = filtrarPorVentana(serieNivel, horas);
    if (puntos.length >= MINIMO_PUNTOS_REQUERIDOS) {
      return { puntos, ventanaUsadaHoras: horas };
    }
  }

  const ventanaMaxima = VENTANAS_A_INTENTAR_HORAS[VENTANAS_A_INTENTAR_HORAS.length - 1];
  return { puntos: filtrarPorVentana(serieNivel, ventanaMaxima), ventanaUsadaHoras: ventanaMaxima };
}

// Adapta los puntos {fecha, nivel} al formato genérico {x, y} y calcula la pendiente.
function calcularRegresionLineal(puntos) {
  const referencia = puntos[0].fecha.getTime();
  const puntosXY = puntos.map((p) => ({
    x: (p.fecha.getTime() - referencia) / (60 * 60 * 1000), // horas desde el primer punto
    y: p.nivel,
  }));

  return { pendiente: calcularPendiente(puntosXY) };
}

function clasificarTendenciaProyectada(pendienteMetrosPorHora) {
  const cambioEn12h = pendienteMetrosPorHora * HORIZONTE_PROYECCION_HORAS;
  const magnitudAbsoluta = Math.abs(cambioEn12h);

  let direccion;
  if (magnitudAbsoluta < UMBRAL_ESTABLE_M * HORIZONTE_PROYECCION_HORAS) {
    direccion = "estable";
  } else if (cambioEn12h > 0) {
    direccion = "en ascenso";
  } else {
    direccion = "en descenso";
  }

  let magnitud;
  if (magnitudAbsoluta < 0.15) {
    magnitud = "leve";
  } else if (magnitudAbsoluta < 0.5) {
    magnitud = "moderado";
  } else {
    magnitud = "marcado";
  }

  return { direccion, magnitud, cambio_estimado_metros: Number(cambioEn12h.toFixed(2)) };
}

// Genera la predicción para UNA estación a partir de su serie histórica cruda del IDEAM.
function generarPrediccionEstacion(datosIdeam) {
  const serieNivel = datosIdeam?.Hobs?.data || [];

  const { puntos, ventanaUsadaHoras } = obtenerPuntosParaPrediccion(serieNivel);

  if (puntos.length < MINIMO_PUNTOS_REQUERIDOS) {
    return {
      prediccion_disponible: false,
      mensaje: "Sin información suficiente para predecir cambios",
    };
  }

  const { pendiente } = calcularRegresionLineal(puntos);
  const clasificacion = clasificarTendenciaProyectada(pendiente);

  return {
    prediccion_disponible: true,
    tendencia_proyectada: clasificacion.direccion,
    magnitud_proyectada: clasificacion.magnitud,
    cantidad_lecturas_usadas: puntos.length,
    horas_de_historial_usadas: Number(
      ((puntos[puntos.length - 1].fecha.getTime() - puntos[0].fecha.getTime()) / (60 * 60 * 1000)).toFixed(1)
    ),
    ventana_solicitada_horas: ventanaUsadaHoras,
    aclaracion:
      "Proyección basada solo en el comportamiento reciente del río; no considera lluvia futura ni cambios en las descargas de la hidroeléctrica Urrá.",
  };
}

module.exports = { generarPrediccionEstacion };