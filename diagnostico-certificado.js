// Script de diagnóstico: se conecta a Gmail y muestra quién "firmó"
// el certificado que tu computadora está viendo. Esto nos dice
// exactamente qué programa está interceptando la conexión.

const tls = require("tls");

const socket = tls.connect(
  {
    host: "smtp.gmail.com",
    port: 465,
    rejectUnauthorized: false, // solo para poder INSPECCIONAR el certificado, no para enviar nada
  },
  () => {
    const cert = socket.getPeerCertificate(true);

    console.log("=== Certificado recibido ===");
    console.log("Emitido para (subject):", cert.subject);
    console.log("Emitido por (issuer):", cert.issuer);
    console.log("=============================");

    if (cert.issuer && cert.issuer.O) {
      console.log(`\n👉 La conexión está siendo interceptada por: "${cert.issuer.O}"`);
    } else if (cert.issuer && cert.issuer.CN) {
      console.log(`\n👉 La conexión está siendo interceptada por: "${cert.issuer.CN}"`);
    }

    socket.end();
  }
);

socket.on("error", (err) => {
  console.error("Error de conexión:", err.message);
});