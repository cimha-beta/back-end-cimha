// Cliente HTTP de la API de Open-Meteo (sin autenticación).

async function consultarClimaHoy({ latitud, longitud }) {
  const params = new URLSearchParams({
    latitude: latitud,
    longitude: longitud,
    current: "temperature_2m,apparent_temperature,wind_speed_10m,weather_code,cloud_cover",
    hourly: "precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "1",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(`Open-Meteo respondió con error ${response.status}: ${detalle}`);
  }

  return response.json();
}

module.exports = { consultarClimaHoy };