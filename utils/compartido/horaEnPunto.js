// Ayudas para vencer cachés "en hora en punto" (09:00, 10:00, 11:00...).
//
// Cada hora calendario es un "bloque" numérico: todo lo guardado dentro del
// mismo bloque vence junto cuando cambia la hora, sin importar a qué minuto
// se guardó (algo guardado a las 09:59 vence a las 10:00).
//
// Sobre la zona horaria: Colombia no usa horario de verano y su diferencia
// con UTC es de horas completas (UTC-5), así que la hora en punto de
// Colombia coincide con la hora en punto UTC. Railway puede correr en UTC
// sin que esto cause desfases.

const UNA_HORA_MS = 60 * 60 * 1000;

// Número que identifica la hora calendario actual (cambia cada hora en punto).
function claveHoraActual(ahoraMs = Date.now()) {
  return Math.floor(ahoraMs / UNA_HORA_MS);
}

// Milisegundos que faltan para la próxima hora en punto.
function msHastaProximaHora(ahoraMs = Date.now()) {
  return UNA_HORA_MS - (ahoraMs % UNA_HORA_MS);
}

module.exports = { claveHoraActual, msHastaProximaHora };
