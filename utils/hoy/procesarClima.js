// Equivalente al nodo "Code Clima - 01" de n8n.
// Toma la respuesta cruda de Open-Meteo y la simplifica a 7 datos limpios.

const TABLA_ESTADO_CIELO = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos intensos",
  95: "Tormenta eléctrica",
  96: "Tormenta con granizo ligero",
  99: "Tormenta con granizo intenso",
};

function traducirEstadoCielo(codigo, nubes) {
  let descripcion = TABLA_ESTADO_CIELO[codigo] || "Condición no clasificada";

  if (codigo === 0 && nubes > 20) {
    descripcion = "Mayormente despejado";
  }

  return descripcion;
}

function procesarClimaHoy(data) {
  const temperaturaActual = data.current.temperature_2m;
  const sensacionTermica = data.current.apparent_temperature;
  const velocidadViento = data.current.wind_speed_10m;
  const temperaturaMinima = data.daily.temperature_2m_min[0];
  const temperaturaMaxima = data.daily.temperature_2m_max[0];

  const arrayHoras = data.hourly.time;
  const arrayProbabilidad = data.hourly.precipitation_probability;

  const fechaActual = new Date(data.current.time);

  if (fechaActual.getMinutes() >= 30) {
    fechaActual.setHours(fechaActual.getHours() + 1);
  }
  fechaActual.setMinutes(0, 0, 0);

  const horaRedondeada =
    fechaActual.getFullYear() +
    "-" +
    String(fechaActual.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(fechaActual.getDate()).padStart(2, "0") +
    "T" +
    String(fechaActual.getHours()).padStart(2, "0") +
    ":00";

  const posicionHoraActual = arrayHoras.indexOf(horaRedondeada);
  const probabilidadLluvia =
    posicionHoraActual >= 0 ? arrayProbabilidad[posicionHoraActual] : null;

  const estadoCielo = traducirEstadoCielo(data.current.weather_code, data.current.cloud_cover);

  return {
    temperatura_actual: temperaturaActual,
    sensacion_termica: sensacionTermica,
    velocidad_viento: velocidadViento,
    temperatura_minima: temperaturaMinima,
    temperatura_maxima: temperaturaMaxima,
    probabilidad_lluvia: probabilidadLluvia,
    estado_cielo: estadoCielo,
  };
}

module.exports = { procesarClimaHoy };