// Fecha y hora actuales, formateadas en español. Compartida por todas las
// ramas (hoy, mañana, semana) al armar su reporte final.

function obtenerFechaHoraActual() {
  const ahora = new Date();
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  const fecha = `${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;

  let horas12 = ahora.getHours() % 12;
  if (horas12 === 0) horas12 = 12;
  const periodo = ahora.getHours() >= 12 ? "PM" : "AM";
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const hora = `${String(horas12).padStart(2, "0")}:${minutos} ${periodo}`;

  return { fecha, hora };
}

module.exports = { obtenerFechaHoraActual };