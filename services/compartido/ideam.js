// Consulta datos en vivo del IDEAM vía proxy (bloquea peticiones directas).

const PROXY_URL =
  "https://script.google.com/macros/s/AKfycbzIILJXQ4qXaBVWsVAQZj2aq8Grhm3v_rCFF5-6Udd3e5SmIiYo_ha2Z0hKRCzD4d-qaQ/exec";

async function consultarIdeam(codigoEstacion) {
  const urlIdeam = `https://fews.ideam.gov.co/visorfews/data/series/jsonH/${codigoEstacion}.json`;
  const url = `${PROXY_URL}?url=${encodeURIComponent(urlIdeam)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`IDEAM (vía proxy) respondió con error ${response.status}`);
  }

  return response.json();
}

module.exports = { consultarIdeam };