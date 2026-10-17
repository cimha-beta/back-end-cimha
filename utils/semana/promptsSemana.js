// Arma el ÚNICO prompt para la rama "semana": combina el pronóstico de los
// 6 días siguientes + la tendencia de lluvia detectada + el estado y
// proyección del río, en una sola interpretación.

const { construirBloqueEstaciones } = require("../compartido/bloqueEstacionesTexto");

const NOMBRES_DIAS = ["Día 1", "Día 2", "Día 3", "Día 4", "Día 5", "Día 6"];

function encabezadoSistema(departamento, municipio) {
  return (
    `Eres un analista hidrometeorológico automático del río Sinú para ${municipio}, ${departamento}, Colombia. ` +
    `Generas un parte combinado del PRONÓSTICO del clima para los próximos 6 días junto con el comportamiento ` +
    `reciente y proyectado del río. Analizas únicamente la información proporcionada, sin inventar datos. ` +
    `Eres especialmente cuidadoso en NO prometer certeza sobre el nivel del río a varios días — solo puedes ` +
    `razonar de forma general sobre la relación entre la tendencia de lluvia esperada y el comportamiento reciente ` +
    `del río, dejando claro que es una lectura orientativa, no una predicción exacta. Tono cercano, informativo y ` +
    `simple, como un parte comunitario, no narrativo. El texto NO debe contener ningún carácter numérico — todo ` +
    `debe expresarse en palabras. Responde únicamente en JSON válido, sin texto fuera del JSON.`
  );
}

function construirBloqueDiasSemana(diasSemana) {
  let bloque = "";

  diasSemana.forEach((dia, index) => {
    bloque += `\n--- ${NOMBRES_DIAS[index]} (${dia.fecha}) ---\n`;
    bloque += `Estado del cielo: ${dia.estado_cielo}\n`;
    bloque += `Temperatura: entre ${dia.temperatura_minima}°C y ${dia.temperatura_maxima}°C\n`;
    bloque += `Sensación térmica: ${dia.posible_sensacion_termica}\n`;
    bloque += `Viento máximo: ${dia.velocidad_viento} km/h\n`;
    bloque += `Probabilidad de lluvia: ${dia.probabilidad_lluvia}%\n`;
  });

  return bloque;
}

function construirPromptClimaYRioSemana({ departamento, municipio, diasSemana, tendenciaLluvia, estaciones }) {
  const systemPrompt = encabezadoSistema(departamento, municipio);

  const bloqueDias = construirBloqueDiasSemana(diasSemana);
  const bloqueEstaciones = construirBloqueEstaciones(estaciones.estaciones_detalle || []);

  const textoTendenciaLluvia = tendenciaLluvia.tendencia_disponible
    ? `La probabilidad de lluvia a lo largo de la semana muestra una tendencia ${tendenciaLluvia.tendencia_lluvia} (cambio ${tendenciaLluvia.magnitud_tendencia_lluvia}).`
    : "No hay información suficiente para determinar una tendencia clara de lluvia en la semana.";

  const userPrompt = `Analiza el siguiente PRONÓSTICO de los próximos 6 días en ${municipio}, ${departamento}, junto con el estado reciente y la proyección del río Sinú.

--- PRONÓSTICO DÍA POR DÍA ---
${bloqueDias}

--- TENDENCIA DE LLUVIA EN LA SEMANA ---
${textoTendenciaLluvia}

--- ESTADO Y PROYECCIÓN DEL RÍO (${estaciones.cantidad_estaciones} estación(es)) ---
${bloqueEstaciones}

--- DATO CLAVE ---
Estación más cercana al lugar consultado: ${estaciones.nombre_estacion_cercana}
Tendencia actual de esa estación: ${estaciones.tendencia_estacion_cercana}

--- TAREA ---

Genera UNA sola interpretación combinada en 6 a 8 renglones continuos, con tono claro, simple e informativo, como si se lo explicaras a un vecino — no narrativo ni de relato.

Primero da el panorama del clima de la semana en 3 oraciones, de forma explicativa (causa y efecto), con palabras simples y sin cifras: (1) cómo se percibirá la semana frente a lo habitual y por qué, combinando el cielo y la sensación térmica; (2) qué efecto tendrá el viento en esa sensación; (3) si predominan días secos o con lluvia y si esto cambia conforme avanza la semana (usando la tendencia de lluvia calculada), dicho en palabras claras como 'existe un riesgo real de lluvias repentinas hacia el final de la semana'. Habla de forma impersonal o en tercera persona. NO inventes datos que no estén arriba (por ejemplo, no hables de humedad ni de presión si no se proporcionan).

Luego conecta ese panorama de la semana con el río: describe la tendencia reciente y la proyección de la estación más cercana (dato clave), y razona de forma prudente sobre si una semana con más o menos lluvia esperada podría reforzar o no esa tendencia. NO afirmes con certeza qué pasará con el río en varios días — usa un tono de posibilidad ('podría', 'es probable que', 'conviene estar atentos si...').

Es OBLIGATORIO incluir, de forma natural dentro del texto, una aclaración de que esta lectura es orientativa: se basa en el comportamiento reciente del río y el pronóstico de lluvia, pero no considera con precisión la lluvia real que caiga ni las decisiones de la hidroeléctrica Urrá, así que el comportamiento real de la semana puede diferir.

PROHIBIDO usar frases genéricas del tipo: 'la semana estará normal', 'el río sigue igual', 'sin novedades que reportar', sin especificar qué se espera realmente.

Usa vocabulario cotidiano, no técnico. Nada de tecnicismos ni datos numéricos en el texto.

Además de la interpretación, genera RECOMENDACIONES: exactamente 4 puntos. Cada punto es una frase corta (máximo unas 12 palabras) que empieza con un verbo en imperativo (por ejemplo 'Mantén', 'Viste', 'Lleva', 'Evita'). Los 4 puntos cubren aspectos distintos entre sí (por ejemplo: hidratación, vestimenta, lluvia o protección solar, actividades al aire libre) y se basan SOLO en el clima de la semana (cielo, sensación térmica, viento, lluvia), no en el río. Si no hay riesgo de lluvia, cambia ese punto por protección solar u otro consejo que sí aplique. Sin tecnicismos ni datos numéricos.

Si falta información suficiente para responder con algo de sustancia, escribe 'Sin información suficiente' en la interpretación y deja la lista de recomendaciones vacía.

--- FORMATO DE RESPUESTA ---
{
  "interpretacion": "texto",
  "recomendaciones": ["punto 1", "punto 2", "punto 3", "punto 4"]
}`;

  return { systemPrompt, userPrompt };
}

module.exports = { construirPromptClimaYRioSemana };