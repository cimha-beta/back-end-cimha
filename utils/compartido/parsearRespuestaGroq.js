// Parsea la respuesta JSON que devuelve Groq. Compartida por todas las
// ramas (hoy, mañana, semana) que usan IA para interpretar datos.

function parsearRespuestaGroq(contenidoTexto, campoEsperado) {
  try {
    const parsed = JSON.parse(contenidoTexto);
    return parsed[campoEsperado] || "Sin información suficiente";
  } catch (error) {
    return "Sin información suficiente";
  }
}

module.exports = { parsearRespuestaGroq };