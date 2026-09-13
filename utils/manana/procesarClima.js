// Equivalente al nodo "Code Clima -02" de n8n.
// Extrae y combina el pronóstico de MAÑANA (índice 1 del arreglo diario).

const TABLA_ESTADO_CIELO = {
  0: "Despejado",
  1: "Mayormente Despejado",
  2: "Parcialmente Nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina con Escarcha",
  51: "Llovizna Ligera",
  53: "Llovizna Moderada",
  55: "Llovizna Intensa",
  61: "Lluvia Ligera",
  63: "Lluvia Moderada",
  65: "Lluvia Intensa",
  80: "Chubascos Ligeros",
  81: "Chubascos Moderados",
  82: "Chubascos Intensos",
  95: "Tormenta Eléctrica",
  96: "Tormenta con Granizo Ligero",
  99: "Tormenta con Granizo Intenso",
};

function traducirEstadoCielo(codigo, nubesPromedio) {
  let descripcion = TABLA_ESTADO_CIELO[codigo] || "Condición no clasificada";

  if (codigo === 0 && nubesPromedio > 20) {
    descripcion = "Mayormente despejado";
  }

  return descripcion;
}

function procesarClimaManana(data) {
  const idx = 1; // con forecast_days=2: posición 0 es hoy, 1 es mañana

  const temperaturaMinima = data.daily.temperature_2m_min[idx];
  const temperaturaMaxima = data.daily.temperature_2m_max[idx];
  const velocidadViento = data.daily.wind_speed_10m_max[idx];
  const probabilidadLluvia = data.daily.precipitation_probability_max[idx];

  const sensacionMin = data.daily.apparent_temperature_min[idx];
  const sensacionMax = data.daily.apparent_temperature_max[idx];
  const posibleSensacionTermica = `Entre ${sensacionMin}°C y ${sensacionMax}°C`;

  const weatherCode = data.daily.weather_code[idx];
  const nubosidadPromedio = data.daily.cloud_cover_mean[idx];
  const estadoCielo = traducirEstadoCielo(weatherCode, nubosidadPromedio);

  return {
    estado_cielo: estadoCielo,
    posible_sensacion_termica: posibleSensacionTermica,
    temperatura_minima: temperaturaMinima,
    temperatura_maxima: temperaturaMaxima,
    velocidad_viento: velocidadViento,
    probabilidad_lluvia: probabilidadLluvia,
  };
}

module.exports = { procesarClimaManana };