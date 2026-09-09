// Equivalente al nodo "Code Clima -03" de n8n.
// Recorre las posiciones 1 a 6 del pronóstico (los 6 días siguientes a hoy)
// y devuelve un arreglo con un objeto por día.

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

function traducirEstadoCielo(codigo, nubesPromedio) {
  let descripcion = TABLA_ESTADO_CIELO[codigo] || "Condición no clasificada";

  if (codigo === 0 && nubesPromedio > 20) {
    descripcion = "Mayormente despejado";
  }

  return descripcion;
}

function procesarClimaSemana(data) {
  const diasSemana = [];

  for (let idx = 1; idx <= 6; idx++) {
    const fecha = data.daily.time[idx];

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

    diasSemana.push({
      fecha,
      estado_cielo: estadoCielo,
      posible_sensacion_termica: posibleSensacionTermica,
      temperatura_minima: temperaturaMinima,
      temperatura_maxima: temperaturaMaxima,
      velocidad_viento: velocidadViento,
      probabilidad_lluvia: probabilidadLluvia,
    });
  }

  return diasSemana;
}

module.exports = { procesarClimaSemana };