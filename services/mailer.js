// Cliente de envío de correos de CIMHA mediante Google Apps Script.
// Reemplaza a Nodemailer/SMTP: el backend llama por HTTPS a una web app de
// Apps Script, que envía el correo con GmailApp desde la cuenta dueña del script.
// Mantiene las mismas exportaciones, así que routes/reportes.js no cambia.

function validarVariablesEntorno() {
  const faltantes = [];
  if (!process.env.GAS_URL) faltantes.push("GAS_URL");
  if (!process.env.GAS_SECRET) faltantes.push("GAS_SECRET");
  if (!process.env.CIMHA_INTERNAL_EMAIL) faltantes.push("CIMHA_INTERNAL_EMAIL");

  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno de correo: ${faltantes.join(", ")}`);
  }
}

// Un solo intento de envío a Apps Script.
async function llamarAppsScript({ to, subject, html, replyTo }) {
  const respuesta = await fetch(process.env.GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: process.env.GAS_SECRET, to, subject, html, replyTo }),
    redirect: "follow", // Apps Script responde con una redirección 302
    signal: AbortSignal.timeout(20000),
  });

  const texto = await respuesta.text();
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (_err) {
    throw new Error(`Respuesta inválida de Apps Script (HTTP ${respuesta.status})`);
  }

  if (!datos.ok) {
    throw new Error(`Apps Script rechazó el envío: ${datos.error || "error desconocido"}`);
  }
  return datos;
}

// Reintenta una vez si falla (red, timeout o error transitorio de Google).
async function enviar(opciones) {
  validarVariablesEntorno();
  try {
    return await llamarAppsScript(opciones);
  } catch (error) {
    console.warn(`⚠️ Falló el envío (${error.message}), reintentando...`);
    return llamarAppsScript(opciones);
  }
}

// Correo interno para el equipo de CIMHA
async function enviarCorreoInterno({ asunto, cuerpoHtml, correoRemitente }) {
  return enviar({
    to: process.env.CIMHA_INTERNAL_EMAIL,
    replyTo: correoRemitente, // permite responder directo al ciudadano
    subject: asunto,
    html: cuerpoHtml,
  });
}

// Correo de confirmación para quien envió el reporte
async function enviarCorreoConfirmacion({ destinatario, asunto, cuerpoHtml }) {
  return enviar({
    to: destinatario,
    subject: asunto,
    html: cuerpoHtml,
  });
}

// Diagnóstico sin secretos: dice qué variables faltan y si Apps Script responde.
async function diagnosticarCorreo() {
  const variables = {
    GAS_URL: !!process.env.GAS_URL,
    GAS_SECRET: !!process.env.GAS_SECRET,
    CIMHA_INTERNAL_EMAIL: !!process.env.CIMHA_INTERNAL_EMAIL,
  };

  if (!Object.values(variables).every(Boolean)) {
    return { ok: false, variables, appsScript: "faltan variables de entorno" };
  }

  try {
    const respuesta = await fetch(process.env.GAS_URL, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const datos = await respuesta.json();
    return {
      ok: datos.ok === true,
      variables,
      appsScript: datos.ok === true ? "conectado" : "respuesta inesperada",
    };
  } catch (error) {
    return { ok: false, variables, appsScript: error.message };
  }
}

module.exports = { enviarCorreoInterno, enviarCorreoConfirmacion, diagnosticarCorreo };