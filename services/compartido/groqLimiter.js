// "Portero" de tokens: encola peticiones a Groq para no exceder el límite por minuto.

const LIMITE_TOKENS_POR_MINUTO = 7000; // margen bajo el límite real (8000)
const VENTANA_MS = 60 * 1000; // 1 minuto

let tokensUsadosEnVentana = 0;
let inicioVentana = Date.now();

const colaEspera = [];
let procesandoCola = false;

function reiniciarVentanaSiCorresponde() {
  const ahora = Date.now();
  if (ahora - inicioVentana >= VENTANA_MS) {
    tokensUsadosEnVentana = 0;
    inicioVentana = ahora;
  }
}

async function procesarCola() {
  if (procesandoCola) return;
  procesandoCola = true;

  while (colaEspera.length > 0) {
    reiniciarVentanaSiCorresponde();

    const siguiente = colaEspera[0];

    if (tokensUsadosEnVentana + siguiente.tokensEstimados <= LIMITE_TOKENS_POR_MINUTO) {
      tokensUsadosEnVentana += siguiente.tokensEstimados;
      colaEspera.shift();
      siguiente.resolver();
    } else {
      const msHastaSiguienteVentana = VENTANA_MS - (Date.now() - inicioVentana) + 200;
      console.log(
        `⏳ Límite de tokens/minuto de Groq alcanzado (${tokensUsadosEnVentana}/${LIMITE_TOKENS_POR_MINUTO}). ` +
          `Esperando ~${Math.round(msHastaSiguienteVentana / 1000)}s antes de la siguiente consulta a la IA...`
      );
      await new Promise((resolve) => setTimeout(resolve, msHastaSiguienteVentana));
    }
  }

  procesandoCola = false;
}

function reservarTurno(tokensEstimados) {
  return new Promise((resolve) => {
    colaEspera.push({ tokensEstimados, resolver: resolve });
    procesarCola();
  });
}

function estimarTokens(texto) {
  return Math.ceil((texto || "").length / 4);
}

module.exports = { reservarTurno, estimarTokens };