// Fecha y hora actuales, formateadas en español. Compartida por todas las
// ramas (hoy, mañana, semana) al armar su reporte final.

const ZONA_HORARIA = "America/Bogota";

function obtenerFechaHoraActual() {
  const ahora = new Date();
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  // Railway (y la mayoría de hosts) corren el servidor en UTC, no en hora
  // de Colombia. Usar getDate()/getHours() directamente tomaría la hora UTC
  // del servidor en vez de la hora de Bogotá. Por eso extraemos cada
  // componente ya convertido a America/Bogota con Intl.DateTimeFormat.
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(ahora);

  const obtener = (tipo) => partes.find((p) => p.type === tipo).value;

  const anio = obtener("year");
  const mesIndice = Number(obtener("month")) - 1;
  const dia = Number(obtener("day"));
  let horas24 = Number(obtener("hour"));
  if (horas24 === 24) horas24 = 0; // Intl a veces da "24" para medianoche
  const minutosNum = Number(obtener("minute"));

  const fecha = `${dia} de ${meses[mesIndice]} de ${anio}`;

  let horas12 = horas24 % 12;
  if (horas12 === 0) horas12 = 12;
  const periodo = horas24 >= 12 ? "PM" : "AM";
  const minutos = String(minutosNum).padStart(2, "0");
  const hora = `${String(horas12).padStart(2, "0")}:${minutos} ${periodo}`;

  return { fecha, hora };
}

module.exports = { obtenerFechaHoraActual };