const nodemailer = require("nodemailer");
const dns = require("dns").promises;

// Transportador de Gmail para el envío de correos del sistema de reportes.

const GMAIL_HOST = "smtp.gmail.com";
const PUERTOS = [465, 587]; // 465 = SSL directo, 587 = STARTTLS (respaldo)

let transporterCache = null;

// Falla temprano y con mensaje claro si faltan credenciales en Railway.
function validarVariablesEntorno() {
  const faltantes = [];
  if (!process.env.GMAIL_USER) faltantes.push("GMAIL_USER");
  if (!process.env.GMAIL_APP_PASSWORD) faltantes.push("GMAIL_APP_PASSWORD");
  if (!process.env.CIMHA_INTERNAL_EMAIL) faltantes.push("CIMHA_INTERNAL_EMAIL");

  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno de correo: ${faltantes.join(", ")}`);
  }
}

// Gmail rechaza la contraseña de aplicación si lleva espacios (se copia con ellos desde Google).
function obtenerPassword() {
  return process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "");
}

// Devuelve las IPv4 de Gmail; nodemailer mezcla IPv4/IPv6 al azar y Railway no tiene salida IPv6.
async function resolverIPv4() {
  try {
    return await dns.resolve4(GMAIL_HOST);
  } catch (_err) {
    const resultado = await dns.lookup(GMAIL_HOST, { family: 4 });
    return [resultado.address];
  }
}

function construirTransporter(ip, puerto) {
  return nodemailer.createTransport({
    host: ip,
    port: puerto,
    secure: puerto === 465,
    requireTLS: puerto === 587,
    tls: { servername: GMAIL_HOST }, // conserva SNI y validación del certificado en el hostname real
    auth: { user: process.env.GMAIL_USER, pass: obtenerPassword() },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
}

// Prueba cada IPv4 y cada puerto hasta que uno conecte y autentique; cachea el que funcione.
async function obtenerTransporter() {
  if (transporterCache) return transporterCache;

  validarVariablesEntorno();
  const ips = await resolverIPv4();
  const errores = [];

  for (const puerto of PUERTOS) {
    for (const ip of ips) {
      const candidato = construirTransporter(ip, puerto);
      try {
        await candidato.verify();
        console.log(`📬 SMTP listo vía ${ip}:${puerto}`);
        transporterCache = candidato;
        return candidato;
      } catch (error) {
        errores.push(`${ip}:${puerto} -> ${error.code || error.message}`);
        candidato.close();
      }
    }
  }

  throw new Error(`No se pudo conectar a Gmail. Intentos: ${errores.join(" | ")}`);
}

// Si la conexión cacheada se cae, se descarta y se reintenta una vez con una nueva.
async function enviar(opciones) {
  let transporter = await obtenerTransporter();
  try {
    return await transporter.sendMail(opciones);
  } catch (error) {
    console.warn(`⚠️ Falló el envío (${error.code || error.message}), reintentando con conexión nueva...`);
    transporterCache = null;
    transporter = await obtenerTransporter();
    return transporter.sendMail(opciones);
  }
}

// Correo interno para el equipo de CIMHA
async function enviarCorreoInterno({ asunto, cuerpoHtml, correoRemitente }) {
  return enviar({
    from: `"CIMHA" <${process.env.GMAIL_USER}>`,
    to: process.env.CIMHA_INTERNAL_EMAIL,
    replyTo: correoRemitente, // permite responder directo al ciudadano
    subject: asunto,
    html: cuerpoHtml,
  });
}

// Correo de confirmación para quien envió el reporte
async function enviarCorreoConfirmacion({ destinatario, asunto, cuerpoHtml }) {
  return enviar({
    from: `"CIMHA" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: cuerpoHtml,
  });
}

// Diagnóstico sin secretos: dice qué variables faltan y si el SMTP conecta.
async function diagnosticarCorreo() {
  const variables = {
    GMAIL_USER: !!process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD,
    CIMHA_INTERNAL_EMAIL: !!process.env.CIMHA_INTERNAL_EMAIL,
  };

  const longitudPassword = process.env.GMAIL_APP_PASSWORD ? obtenerPassword().length : 0;

  try {
    await obtenerTransporter();
    return { ok: true, variables, longitudPassword, smtp: "conectado" };
  } catch (error) {
    return { ok: false, variables, longitudPassword, smtp: error.message };
  }
}

module.exports = { enviarCorreoInterno, enviarCorreoConfirmacion, diagnosticarCorreo };