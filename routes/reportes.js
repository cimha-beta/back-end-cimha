const express = require("express");
const router = express.Router();

const { construirCorreos } = require("../utils/plantillasCorreo");
const {
  enviarCorreoInterno,
  enviarCorreoConfirmacion,
} = require("../services/mailer");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarReporte(body) {
  const errores = [];

  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    errores.push("El correo electrónico no es válido.");
  }
  if (!body.asunto || body.asunto.trim().length < 3) {
    errores.push("El asunto es obligatorio (mínimo 3 caracteres).");
  }
  if (!body.departamento) {
    errores.push("El departamento es obligatorio.");
  }
  if (!body.municipio) {
    errores.push("El municipio es obligatorio.");
  }
  if (!body.tipo) {
    errores.push("El tipo de reporte es obligatorio.");
  }
  if (!body.descripcion || body.descripcion.trim().length < 10) {
    errores.push("La descripción es obligatoria (mínimo 10 caracteres).");
  }

  return errores;
}

// Equivalente a: Webhook -> Code in JavaScript -> Send a message (CIMHA) -> Send a message (Remitente)
router.post("/correo-reportes", async (req, res) => {
  const body = req.body || {};

  // Validación real de servidor: aunque alguien se salte el formulario
  // y mande datos incompletos directo, aquí se rechazan.
  const errores = validarReporte(body);
  if (errores.length > 0) {
    return res.status(400).json({ ok: false, errores });
  }

  try {
    const {
      correoRemitente,
      asuntoCorreo,
      cuerpoCorreo,
      asuntoAmable,
      cuerpoAmable,
    } = construirCorreos(body);

    // 1. Correo interno para CIMHA
    await enviarCorreoInterno({
      asunto: asuntoCorreo,
      cuerpoHtml: cuerpoCorreo,
      correoRemitente,
    });

    // 2. Correo de confirmación para quien reportó
    await enviarCorreoConfirmacion({
      destinatario: correoRemitente,
      asunto: asuntoAmable,
      cuerpoHtml: cuerpoAmable,
    });

    return res.status(200).json({ ok: true, mensaje: "Reporte enviado correctamente." });
  } catch (error) {
    console.error("Error al procesar el reporte:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo procesar el reporte. Intenta de nuevo más tarde.",
    });
  }
});

module.exports = router;