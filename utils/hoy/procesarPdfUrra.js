// Equivalente a: nodo "Extract from File" (lee el PDF) + "Code in JavaScript1"
// (extrae con regex la fila más reciente de la tabla de datos del embalse).

const { PDFParse } = require("pdf-parse");

function formatHora12(hora, minutos) {
  let h = parseInt(hora, 10);
  const periodo = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return String(h).padStart(2, "0") + ":" + minutos + " " + periodo;
}

async function procesarPdfUrra(bufferPdf) {
  const parser = new PDFParse({ data: bufferPdf });
  const resultado = await parser.getText();
  const texto = resultado.text || "";

  const patron = /(\d{1,2}):(\d{2})\s+(\d+,\d+)\s+(\d+,\d+)\s+(\d+,\d+)\s+(\d+,\d+)/g;

  const coincidencias = [];
  let match;

  while ((match = patron.exec(texto)) !== null) {
    coincidencias.push({
      hora: formatHora12(match[1], match[2]),
      hora24: String(match[1]).padStart(2, "0") + ":" + match[2],
      nivel_embalse: match[3].replace(",", "."),
      caudal_entrante: match[4].replace(",", "."),
      caudal_turbinas: match[5].replace(",", "."),
      caudal_rebosadero: match[6].replace(",", "."),
    });
  }

  if (coincidencias.length === 0) {
    throw new Error(
      "No se encontraron datos horarios en el PDF. Revisa si el formato del reporte cambió."
    );
  }

  const vistos = new Set();
  const unicos = coincidencias.filter((m) => {
    if (vistos.has(m.hora24)) return false;
    vistos.add(m.hora24);
    return true;
  });

  unicos.sort((a, b) => {
    const [hA, mA] = a.hora24.split(":").map(Number);
    const [hB, mB] = b.hora24.split(":").map(Number);
    return hB * 60 + mB - (hA * 60 + mA);
  });

  const ultimaFila = unicos[0];

  return {
    hora: ultimaFila.hora,
    nivel_embalse: `${ultimaFila.nivel_embalse} `,
    caudal_entrante: `${ultimaFila.caudal_entrante} `,
    caudal_turbinas: `${ultimaFila.caudal_turbinas} `,
    caudal_rebosadero: `${ultimaFila.caudal_rebosadero} `,
  };
}

module.exports = { procesarPdfUrra };