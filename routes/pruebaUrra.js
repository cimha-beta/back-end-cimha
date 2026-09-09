const express = require("express");
const router = express.Router();

const { buscarUltimoUrraBot } = require("../services/compartido/baserow");
const { descargarPdfUrra } = require("../services/hoy/googleDrive");
const { procesarPdfUrra } = require("../utils/hoy/procesarPdfUrra");

// Ruta TEMPORAL solo para probar esta pieza aislada.
// Equivalente a: UrraBot. -> Downland -> Extract from File -> Code in JavaScript1
router.get("/prueba-urra-pdf", async (req, res) => {
  try {
    console.log("📄 Buscando el último registro de UrraBot en Baserow...");
    const registro = await buscarUltimoUrraBot();

    if (!registro) {
      return res.status(404).json({ ok: false, mensaje: "No hay registros de UrraBot en Baserow." });
    }
    console.log("✅ Registro encontrado, file_id:", registro.file_id);

    console.log("⬇️ Descargando el PDF desde Google Drive...");
    const bufferPdf = await descargarPdfUrra(registro.file_id);
    console.log(`✅ PDF descargado (${bufferPdf.length} bytes)`);

    console.log("📖 Extrayendo datos de la tabla del PDF...");
    const datosUrra = await procesarPdfUrra(bufferPdf);
    console.log("✅ Datos extraídos:", datosUrra);

    return res.status(200).json({ ok: true, datosUrra });
  } catch (error) {
    console.error("❌ Error en la prueba de PDF de Urrá:", error.message);
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
});

module.exports = router;