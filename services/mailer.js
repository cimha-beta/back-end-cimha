const nodemailer = require("nodemailer");
const dns = require("dns").promises;

// Transportador de Gmail para el envío de correos del sistema de reportes.

const GMAIL_HOST = "smtp.gmail.com";
const GMAIL_PORT = 465;

// Resuelve la IPv4 de Gmail y la usa directo, evitando que nodemailer elija al azar entre IPv4/IPv6 (Railway no soporta salida IPv6).
async function crearTransporter() {
  let ip;
  try {
    const direcciones = await dns.resolve4(GMAIL_HOST);
    ip = direcciones[0];
  } catch (_err) {
    const resultado = await dns.lookup(GMAIL_HOST, { family: 4 });
    ip = resultado.address;
  }

  return nodemailer.createTransport({
    host: ip,
    port: GMAIL_PORT,
    secure: true,
    tls: {
      servername: GMAIL_HOST, // conserva el SNI y la validación del certificado en el hostname real
    },
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// Correo interno para el equipo de CIMHA
async function enviarCorreoInterno({ asunto, cuerpoHtml, correoRemitente }) {
  const transporter = await crearTransporter();
  return transporter.sendMail({
    from: `"CIMHA" <${process.env.GMAIL_USER}>`,
    to: process.env.CIMHA_INTERNAL_EMAIL,
    replyTo: correoRemitente, // permite responder directo al ciudadano
    subject: asunto,
    html: cuerpoHtml,
  });
}

// Correo de confirmación para quien envió el reporte
async function enviarCorreoConfirmacion({ destinatario, asunto, cuerpoHtml }) {
  const transporter = await crearTransporter();
  return transporter.sendMail({
    from: `"CIMHA" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: cuerpoHtml,
  });
}

module.exports = { enviarCorreoInterno, enviarCorreoConfirmacion };