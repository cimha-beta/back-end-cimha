// Equivalente al nodo "Code in JavaScript" del workflow de n8n.
// Arma el HTML de los dos correos: el interno (para CIMHA) y el de
// confirmación (para quien envió el reporte).

const LOGO_URL =
  "https://raw.githubusercontent.com/hidrosinubot-lgtm/cimha/b401408be06d7d5a32fac9074f3f43b6b4372a56/assets/cimha-logo.png";

function formatearFecha(fechaISO) {
  const fecha = fechaISO ? new Date(fechaISO) : new Date();
  return fecha.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Convierte caracteres especiales de HTML para que si alguien escribe
// código o etiquetas en el formulario, no se ejecuten dentro del correo.
function escapeHtml(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function construirCorreos(body) {
  const fechaFormateada = formatearFecha(body.fecha);

  const asunto = escapeHtml(body.asunto);
  const departamento = escapeHtml(body.departamento);
  const municipio = escapeHtml(body.municipio);
  const tipo = escapeHtml(body.tipo);
  const descripcion = escapeHtml(body.descripcion);

  const encabezado = `
    <table style="margin: 0 auto 20px auto;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align: middle; padding-right: 12px;">
          <img src="${LOGO_URL}" alt="CIMHA" style="height: 50px; display: block;" />
        </td>
        <td style="vertical-align: middle; font-size: 14px; font-weight: bold; color: #202124; line-height: 1.3;">
          Centro de Inteligencia<br>Meteorológica, Hidrológica y Ambiental
        </td>
      </tr>
    </table>
  `;

  // Correo interno para CIMHA (sin encabezado/logo)
  const cuerpoCorreo = `
    <div style="font-family: Arial, sans-serif; color: #202124; max-width: 600px;">
      <h2 style="margin: 0 0 4px 0; font-size: 15px;">${asunto}</h2>
      <p style="margin: 0 0 4px 0; color: #5f6368; font-size: 14px;">
        ${departamento} - ${municipio} &nbsp;·&nbsp; ${fechaFormateada}
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 15px; font-weight: bold;">${tipo}</p>
      <p style="margin: 6px 0 0 0; font-size: 15px; line-height: 1.5;">
        ${descripcion}
      </p>
    </div>
  `.trim();

  // Correo de confirmación para el remitente (con encabezado/logo)
  const cuerpoAmable = `
    <div style="font-family: Arial, sans-serif; color: #202124; max-width: 600px; margin: 0 auto;">
      ${encabezado}
      <p style="margin: 15px 0 5px 0; font-size: 15px; font-weight: bold;">${tipo}</p>
      <p style="margin: 6px 0 0 0; font-size: 15px; line-height: 1.5;">
        ¡Hola! Ya recibimos tu reporte sobre "${asunto}" y queremos confirmarte que
        nuestro equipo lo está revisando con atención. Verificaremos la información
        junto con los datos disponibles, si necesitamos algún detalle adicional o
        tenemos novedades, nos pondremos en contacto contigo a través de este mismo correo.
        <br><br>
        Agradecemos que te tomes el tiempo de reportarlo, ya que esto nos ayuda a
        mantener la información del sistema CIMHA más precisa y confiable para toda la comunidad.
      </p>
    </div>
  `.trim();

  return {
    correoRemitente: body.email,
    asuntoCorreo: body.asunto, // el asunto real del reporte, para el subject del correo
    cuerpoCorreo,
    asuntoAmable: "Centro de Inteligencia Meteorologica, Hidrologica y Ambiental",
    cuerpoAmable,
  };
}

module.exports = { construirCorreos };