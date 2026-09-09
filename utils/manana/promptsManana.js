// Arma el ÚNICO prompt para la rama "mañana": combina el pronóstico del
// clima con el estado + proyección del río en una sola interpretación.

function encabezadoSistema(departamento, municipio) {
  return (
    `Eres un analista hidrometeorológico automático del río Sinú para ${municipio}, ${departamento}, Colombia. ` +
    `Generas un parte combinado del PRONÓSTICO del clima para mañana junto con el comportamiento reciente y ` +
    `proyectado del río. Analizas únicamente la información proporcionada, sin inventar datos. Tono cercano, ` +
    `informativo y simple, como un parte comunitario, no narrativo ni de relato. El texto NO debe contener ningún ` +
    `carácter numérico (ni temperaturas, ni niveles, ni porcentajes, ni cifras de ningún tipo) — todo debe ` +
    `expresarse en palabras. Responde únicamente en JSON válido, sin texto fuera del JSON.`
  );
}

// Arma el bloque de texto por estación, incluyendo la proyección de 12h
// (esto es distinto al bloque de "hoy", que no tiene predicción).
const { construirBloqueEstaciones } = require("../compartido/bloqueEstacionesTexto");

function construirPromptClimaYRio({ departamento, municipio, clima, estaciones }) {
  const systemPrompt = encabezadoSistema(departamento, municipio);

  const bloqueEstaciones = construirBloqueEstaciones(estaciones.estaciones_detalle || []);

  const userPrompt = `Analiza el siguiente PRONÓSTICO para MAÑANA en ${municipio}, ${departamento}, junto con el estado reciente y la proyección del río Sinú.

--- PRONÓSTICO DEL CLIMA PARA MAÑANA ---
Estado del cielo esperado: ${clima.estado_cielo}
Temperatura mínima esperada: ${clima.temperatura_minima} °C
Temperatura máxima esperada: ${clima.temperatura_maxima} °C
Posible sensación térmica: ${clima.posible_sensacion_termica}
Viento máximo esperado: ${clima.velocidad_viento} km/h
Probabilidad de lluvia: ${clima.probabilidad_lluvia} %

--- ESTADO Y PROYECCIÓN DEL RÍO (${estaciones.cantidad_estaciones} estación(es)) ---
${bloqueEstaciones}

--- DATO CLAVE ---
Estación más cercana al lugar consultado: ${estaciones.nombre_estacion_cercana}
Tendencia actual de esa estación: ${estaciones.tendencia_estacion_cercana}

--- TAREA ---

Genera UNA sola interpretación combinada (clima + río) en 5 a 7 renglones continuos, con tono claro, simple e informativo, como si se lo explicaras a un vecino — no narrativo ni de relato.

Primero describe brevemente qué esperar del clima mañana (cielo, sensación de calor o frescor, viento, si hay chance de lluvia), con palabras simples de uso diario, sin mencionar cifras.

Luego conecta esa expectativa de clima con el posible comportamiento del río: si se espera lluvia significativa, menciona que eso podría sumarse a la tendencia actual. Describe la proyección de la estación más cercana (dato clave) usando palabras de magnitud simples ('un cambio leve', 'una subida notoria', 'apenas se nota diferencia'), sin números.

Es OBLIGATORIO incluir, de forma natural dentro del texto (no como nota aparte), una aclaración de que esta proyección del río se basa en su comportamiento reciente, y que puede cambiar si llueve más de lo esperado o si la hidroeléctrica Urrá modifica sus descargas.

PROHIBIDO usar frases genéricas del tipo: 'el clima estará agradable', 'el río sigue igual', 'sin novedades que reportar', sin especificar qué se espera realmente.

Usa vocabulario cotidiano, no técnico (evita 'caudal', 'nivel hidrométrico'; usa 'cantidad de agua', 'qué tan alto está el río'). Nada de tecnicismos ni datos numéricos en el texto.

Si falta información suficiente para responder con algo de sustancia, escribe: 'Sin información suficiente'.

--- FORMATO DE RESPUESTA ---
{
  "interpretacion": "texto"
}`;

  return { systemPrompt, userPrompt };
}

module.exports = { construirPromptClimaYRio };