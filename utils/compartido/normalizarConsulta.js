const PALABRAS_MENORES = ["de", "del", "la", "las", "los", "el", "y"];

function normalizarTexto(texto) {
  const textoLimpio = texto.trim().toLowerCase().replace(/\s+/g, " ");
  return textoLimpio
    .split(" ")
    .map((palabra, i) =>
      i > 0 && PALABRAS_MENORES.includes(palabra)
        ? palabra
        : palabra.charAt(0).toUpperCase() + palabra.slice(1)
    )
    .join(" ");
}

function normalizarConsulta(body) {
  const departamento = body.departamento;
  const municipio = body.municipio;
  const consulta = body.consulta;

  if (!departamento || departamento.trim() === "") {
    throw new Error('El campo "departamento" es obligatorio y no puede estar vacío.');
  }
  if (!municipio || municipio.trim() === "") {
    throw new Error('El campo "municipio" es obligatorio y no puede estar vacío.');
  }
  if (!consulta || consulta.trim() === "") {
    throw new Error('El campo "consulta" es obligatorio y no puede estar vacío.');
  }

  const consultaLimpia = consulta.trim().toLowerCase();

  if (!TIPOS_VALIDOS.includes(consultaLimpia)) {
    throw new Error(
      `El campo "consulta" debe ser uno de: ${TIPOS_VALIDOS.join(", ")}. Recibido: "${consulta}"`
    );
  }

  return {
    departamento: normalizarTexto(departamento),
    municipio: normalizarTexto(municipio),
    consulta: consultaLimpia,
  };
}

module.exports = { normalizarConsulta };