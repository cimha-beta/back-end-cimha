const express = require("express");
const router = express.Router();

const { crearFilaUrraBot } = require("../services/compartido/baserow");

// Equivalente a: Webhook1 -> Code in JavaScript2 -> UrraBot
router.post("/urra-pdf", async (req, res) => {
  const body = req.body || {};

  // OJO: el script de Python (test_urra.py) manda el campo "fecha",
  // NO "fecha_reporte" (ese era el bug que tenía el nodo Code en n8n).
  const fileId = body.file_id;
  const fecha = body.fecha;

  if (!fileId || !fecha) {
    return res.status(400).json({
      ok: false,
      mensaje: "Se requieren 'file_id' y 'fecha' en el cuerpo de la petición.",
    });
  }

  try {
    await crearFilaUrraBot({ fileId, fecha });

    return res.status(200).json({
      ok: true,
      mensaje: "Registro guardado correctamente en Baserow.",
    });
  } catch (error) {
    console.error("Error al guardar en Baserow:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo guardar el registro. Intenta de nuevo más tarde.",
    });
  }
});

module.exports = router;