// Descarga el PDF del reporte de Urrá desde Google Drive.

async function descargarPdfUrra(fileId) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar el PDF de Drive (status ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { descargarPdfUrra };