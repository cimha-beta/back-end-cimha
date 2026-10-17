// Arma los prompts (instrucciones) para cada una de las 3 llamadas a Groq.
// Los textos son los mismos que en n8n, pero ADAPTADOS: en vez de tener
// "Lorica, Córdoba" fijo en el texto, se arma dinámicamente con el
// departamento/municipio real de cada consulta.

function encabezadoSistema(rolEspecifico, departamento, municipio) {
  return (
    `Eres un analista hidrometeorológico automático del río Sinú para ${municipio}, ${departamento}, Colombia. ` +
    `Analizas únicamente la información proporcionada. No inventas datos ni interpretaciones fuera del ` +
    `contexto recibido. Tus prioridades son: 1. Precisión 2. Claridad 3. Sencillez. ${rolEspecifico}`
  );
}


function construirPromptClima({ departamento, municipio, clima }) {
  const systemPrompt = encabezadoSistema(
    `Informas las condiciones climáticas actuales en lenguaje natural, claro y fácil de entender para cualquier persona, con un tono informativo y cercano — como un parte del tiempo comunitario, no como un relato o una descripción literaria. Explicas cómo se percibe el día y por qué, conectando causa y efecto entre los datos. Evita frases genéricas, vacías o que podrían aplicar a cualquier día (como 'el clima está agradable', 'buen día para disfrutar', 'condiciones normales', 'un día como cualquier otro'). Evita repeticiones, exageraciones y lenguaje alarmista. El texto NO debe contener ningún carácter numérico (ni temperaturas, ni porcentajes, ni cifras de ningún tipo) — todo debe expresarse en palabras. Responde únicamente en JSON válido, sin texto fuera del JSON.`,
    departamento,
    municipio
  );

  const userPrompt = `Analiza los siguientes datos climáticos actuales de ${municipio}, ${departamento}.

--- CLIMA ACTUAL ---
Estado del cielo: ${clima.estado_cielo}
Temperatura actual: ${clima.temperatura_actual} °C
Sensación térmica: ${clima.sensacion_termica} °C
Probabilidad de lluvia: ${clima.probabilidad_lluvia} %
Viento: ${clima.velocidad_viento} km/h

--- TAREA ---

Genera DOS cosas: una interpretación del clima y una lista de recomendaciones.

Antes de escribir, identifica mentalmente estas tres cosas a partir de los datos:
(a) el estado del cielo (despejado / parcialmente nublado / nublado / lluvia),
(b) si la sensación térmica es notablemente distinta a la temperatura real (diferencia de 3°C o más = se siente más caluroso o más fresco de lo que marca el termómetro),
(c) si el viento es suave (menos de 15 km/h), moderado (15 a 25 km/h) o fuerte (más de 25 km/h).

1) INTERPRETACIÓN (3 oraciones, en un solo párrafo, tono informativo y explicativo, no narrativo ni de relato):
- Primera oración: cómo se percibe el día frente a lo habitual y por qué, combinando el cielo y la sensación térmica (por ejemplo: 'el día se percibe más caluroso de lo normal debido a las nubes densas que cubren el cielo').
- Segunda oración: qué efecto tiene el viento en esa sensación (si casi no hay brisa, la sensación se mantiene; si hay brisa, alivia).
- Tercera oración: el riesgo de lluvia según la probabilidad indicada, dicho en palabras claras (por ejemplo 'existe un riesgo real de lluvia repentina', 'es poco probable que llueva'). Si no hay riesgo, dilo de forma directa.
Habla de forma impersonal o en tercera persona. Usa palabras sencillas de uso diario, sin dramatizar. NO inventes datos que no estén arriba (por ejemplo, no hables de humedad ni de presión si no se proporcionan).

2) RECOMENDACIONES (exactamente 4 puntos):
- Cada punto es una frase corta (máximo unas 12 palabras) que empieza con un verbo en imperativo (por ejemplo 'Mantén', 'Viste', 'Lleva', 'Evita').
- Los 4 puntos deben cubrir aspectos distintos entre sí (por ejemplo: hidratación, vestimenta, lluvia o protección solar, actividades al aire libre) y estar basados específicamente en el cielo, la sensación térmica, el viento y la lluvia identificados arriba. Si no hay riesgo de lluvia, cambia ese punto por protección solar u otro consejo que sí aplique.
- Menciona el río Sinú, los cultivos o las actividades del campo solo si tienen relación directa con la condición climática actual.
- Sin tecnicismos ni datos numéricos.

PROHIBIDO usar frases genéricas del tipo: 'el clima está agradable', 'buen día para disfrutar', 'condiciones normales', 'un día como cualquier otro', 'el tiempo se mantiene estable' sin especificar cómo se siente realmente.

Si falta información suficiente para responder, escribe 'Sin información suficiente' en la interpretación y deja la lista de recomendaciones vacía.

--- FORMATO DE RESPUESTA ---
{
  "interpretacion_clima": "texto",
  "recomendaciones": ["punto 1", "punto 2", "punto 3", "punto 4"]
}`;

  return { systemPrompt, userPrompt };
}

function construirPromptEstaciones({ departamento, municipio, estaciones }) {
  const systemPrompt = encabezadoSistema(
    `Informas el comportamiento del río en lenguaje natural, claro y fácil de entender para cualquier persona, con un tono informativo y cercano — como un parte del tiempo comunitario, no como un relato o una descripción literaria. Usa vocabulario simple y cotidiano, el que usaría cualquier persona en una conversación normal — evita palabras técnicas o poco comunes. Mantén coherencia causa-efecto entre lo que informas: si hay lluvia y el río sube, conéctalo; si no hay lluvia pero el río sube o baja, dilo sin forzar una explicación que no está en los datos. Evita frases genéricas, vacías o que podrían aplicar a cualquier día. Evita repeticiones, exageraciones y lenguaje alarmista. El texto NO debe contener ningún carácter numérico (ni niveles, ni milímetros, ni cifras de ningún tipo) — todo debe expresarse en palabras. Responde únicamente en JSON válido, sin texto fuera del JSON.`,
    departamento,
    municipio
  );

  const userPrompt = `Analiza los siguientes datos en tiempo real de las estaciones del río Sinú relevantes para esta consulta. La cantidad de estaciones varía según el lugar consultado; en este caso hay ${estaciones.cantidad_estaciones} estación(es).

${estaciones.estaciones_texto}

--- DATO CLAVE ---
Estación más cercana al lugar consultado: ${estaciones.nombre_estacion_cercana}
Tendencia de esa estación: ${estaciones.tendencia_estacion_cercana}

--- TAREA ---

Genera una interpretación informativa del comportamiento actual del río Sinú en 4 a 5 renglones continuos, con tono claro, simple e informativo — como si se lo explicaras a un vecino, no narrativo ni de relato. Prioriza la síntesis sobre la enumeración: resume el panorama general y dedica la mayor parte del espacio a explicar qué es lo más relevante para el lugar consultado y por qué.

Al mencionar cada variación (subida, bajada o estabilidad), indica también qué tan relevante parece ese cambio, usando palabras simples de magnitud — por ejemplo 'un cambio leve', 'una subida notoria', 'apenas se nota diferencia', 'un descenso marcado' — sin usar números ni porcentajes.

Conecta la tendencia de cada estación con su precipitación registrada cuando la información lo permita.

Da énfasis especial a la estación más cercana al lugar consultado (dato clave arriba), dejando claro cómo está esa zona específica.

Menciona el posible efecto aguas abajo hacia el lugar consultado únicamente si una estación río arriba muestra un cambio marcado; si los cambios son leves o el río está estable en general, omite esa mención por completo.

PROHIBIDO usar frases genéricas del tipo: 'el río está normal', 'todo sigue igual', 'sin novedades que reportar', 'el comportamiento es el esperado' sin especificar qué está pasando realmente.

Usa palabras cotidianas, no técnicas (evita 'caudal', 'nivel hidrométrico', 'tendencia hidrológica'; usa 'cantidad de agua', 'qué tan alto está el río', 'cómo se está comportando'). Nada de tecnicismos ni datos numéricos en el texto.

El texto debe leerse como una idea completa y conclusiva, no como una lista de datos por estación.

Si falta información suficiente para responder, escribe: 'Sin información suficiente'.

--- FORMATO DE RESPUESTA ---
{
  "interpretacion_estaciones": "texto"
}`;

  return { systemPrompt, userPrompt };
}

function construirPromptUrra({ departamento, municipio, urra }) {
  const systemPrompt = encabezadoSistema(
    `Informas el estado operativo del embalse Urrá en lenguaje natural, claro y fácil de entender para cualquier persona, con un tono informativo y cercano — como un parte comunitario, no como un relato. Usa vocabulario simple y cotidiano, evita palabras técnicas. Evita frases genéricas, vacías o repetitivas. Evita exageraciones y lenguaje alarmista. El texto NO debe contener ningún carácter numérico ni rangos (ni metros, ni m³/s, ni cifras de ningún tipo) — todo debe expresarse en palabras. Responde únicamente en JSON válido, sin texto fuera del JSON.`,
    departamento,
    municipio
  );

  const userPrompt = `Analiza el siguiente estado operativo actual del embalse de la hidroeléctrica Urrá I.

--- DATOS ACTUALES ---
Hora del reporte: ${urra.hora}
Nivel del embalse: ${urra.nivel_embalse}
Caudal entrante: ${urra.caudal_entrante}
Caudal turbinas: ${urra.caudal_turbinas}
Caudal rebosadero: ${urra.caudal_rebosadero}

--- CRITERIOS PARA TU ANÁLISIS INTERNO (no menciones números ni rangos en el texto final) ---

Clasifica el nivel del embalse según estos rangos, usando solo la palabra correspondiente: menor a 122 = nivel bajo, fuera de rango normal; entre 122 y 126 = normal-bajo, dentro de rango habitual; entre 126 y 128.5 = normal-alto, cercano a la cota de rebose original; entre 128.5 y 129.5 = alto, sobre la cota de rebose con vertimiento activo; entre 129.5 y 130.5 = muy alto, cerca de la cota máxima con margen de maniobra reducido; mayor a 130.5 = crítico, cota máxima superada, contingencia operativa.

Calcula el caudal saliente total (turbinas más rebosadero) y compáralo con el entrante: si el entrante es menor al saliente menos 100 = tiende a vaciarse; si la diferencia está dentro de más/menos 100 = está estable; si el entrante supera al saliente más 100 y es menor o igual a 700 = tiende a llenarse en manejo normal; si el entrante supera 700 = creciente, con posibles mayores descargas.

Clasifica también el caudal saliente total en sí mismo: menor a 200 = descarga baja; entre 200 y 450 = descarga moderada; entre 450 y 700 = descarga alta dentro del máximo normal; mayor a 700 = descarga muy alta, sobre el máximo normal con mayor incidencia aguas abajo.

--- TAREA ---

Genera una interpretación informativa del estado operativo del embalse en 4 a 5 renglones continuos, con tono claro, simple e informativo, priorizando la síntesis sobre la enumeración — como si se lo explicaras a un vecino, cerrando con una conclusión directa sobre lo que esto significa para el río Sinú y las comunidades de la cuenca.

Describe primero el nivel del embalse (según la clasificación de arriba, usando solo la palabra correspondiente, nunca el número ni el rango) y si el agua que entra supera, iguala o es menor que la que sale.

Luego explica cómo ese balance afecta al embalse y cómo el volumen de descarga impacta de forma general el río Sinú a lo largo de la cuenca, sin nombrar municipios específicos.

PROHIBIDO usar frases genéricas del tipo: 'el embalse está normal', 'todo sigue igual', 'sin novedades que reportar', sin especificar qué está pasando realmente.

Usa palabras cotidianas, no técnicas (evita 'caudal', 'cota', 'vertimiento'; usa 'cantidad de agua', 'nivel del embalse', 'lo que se libera'). Nada de tecnicismos ni datos numéricos en el texto.

Si falta información suficiente para responder, escribe: 'Sin información suficiente'.

--- FORMATO DE RESPUESTA ---
{
  "interpretacion_urra": "texto"
}`;

  return { systemPrompt, userPrompt };
}

module.exports = {
  construirPromptClima,
  construirPromptEstaciones,
  construirPromptUrra,
  
};