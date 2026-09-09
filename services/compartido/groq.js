// Cliente HTTP de la API de Groq (IA).

const { reservarTurno, estimarTokens } = require("./groqLimiter");

const TOKENS_RESPUESTA_ESTIMADOS = 400; // margen de la respuesta del modelo

async function llamarGroq({ systemPrompt, userPrompt }) {
  const tokensEstimados =
    estimarTokens(systemPrompt) + estimarTokens(userPrompt) + TOKENS_RESPUESTA_ESTIMADOS;

  await reservarTurno(tokensEstimados);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(`Groq respondió con error ${response.status}: ${detalle}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

module.exports = { llamarGroq };