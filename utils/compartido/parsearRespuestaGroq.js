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

// Extrae una lista de textos (por ejemplo, las recomendaciones) de la respuesta
// JSON de Groq. Si falta el campo o no es una lista, devuelve [].
function parsearListaGroq(contenidoTexto, campoEsperado) {
  try {
    const parsed = JSON.parse(contenidoTexto);
    const lista = parsed[campoEsperado];
    if (!Array.isArray(lista)) return [];
    return lista
      .filter((item) => typeof item === "string" && item.trim() !== "")
      .map((item) => item.trim());
  } catch (error) {
    return [];
  }
}

module.exports = { parsearRespuestaGroq, parsearListaGroq };