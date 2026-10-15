// Consulta datos en vivo del IDEAM vía proxy (bloquea peticiones directas).
// La URL del proxy (Google Apps Script) va en la variable de entorno IDEAM_PROXY_URL.

async function consultarIdeam(codigoEstacion) {
  const proxyUrl = process.env.IDEAM_PROXY_URL;
  if (!proxyUrl) {
    throw new Error("Falta la variable de entorno IDEAM_PROXY_URL");
  }

  const urlIdeam = `https://fews.ideam.gov.co/visorfews/data/series/jsonH/${codigoEstacion}.json`;
  const url = `${proxyUrl}?url=${encodeURIComponent(urlIdeam)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`IDEAM (vía proxy) respondió con error ${response.status}`);
  }

  return response.json();
}

module.exports = { consultarIdeam };