// Cliente HTTP de Open-Meteo para el pronóstico de mañana (forecast_days=2).

async function consultarClimaManana({ latitud, longitud }) {
  const params = new URLSearchParams({
    latitude: latitud,
    longitude: longitud,
    daily:
      "weather_code,cloud_cover_mean,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,wind_speed_10m_max,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "2",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(`Open-Meteo respondió con error ${response.status}: ${detalle}`);
  }

  return response.json();
}

module.exports = { consultarClimaManana };