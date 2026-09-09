const nodemailer = require("nodemailer");

// Transportador de Gmail. Reemplaza los dos nodos "Gmail" de n8n.
// Usa la contraseña de aplicación (App Password) que generaste.

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Correo interno para CIMHA (equivale al nodo "Send a message (CIMHA)")
async function enviarCorreoInterno({ asunto, cuerpoHtml, correoRemitente }) {
  return transporter.sendMail({
    from: `"CIMHA" <${process.env.GMAIL_USER}>`,
    to: process.env.CIMHA_INTERNAL_EMAIL,
    replyTo: correoRemitente, // así el equipo de CIMHA puede responder directo al ciudadano
    subject: asunto,
    html: cuerpoHtml,
  });
}

// Correo de confirmación al remitente (equivale a "Send a message (Remitente)")
async function enviarCorreoConfirmacion({ destinatario, asunto, cuerpoHtml }) {
  return transporter.sendMail({
    from: `"CIMHA" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: cuerpoHtml,
  });
}

module.exports = { enviarCorreoInterno, enviarCorreoConfirmacion };