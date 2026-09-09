// Regresión lineal simple (mínimos cuadrados): y = pendiente * x + intersección.
// Genérica: recibe puntos {x, y} y devuelve la pendiente. Se usa tanto para
// la predicción de nivel de estaciones (utils/manana/generarPrediccion.js)
// como para la tendencia de lluvia semanal (utils/semana/analizarTendenciaClimatica.js).

function calcularPendiente(puntos) {
  const n = puntos.length;

  if (n < 2) return 0;

  const sumaX = puntos.reduce((acc, p) => acc + p.x, 0);
  const sumaY = puntos.reduce((acc, p) => acc + p.y, 0);
  const sumaXY = puntos.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumaX2 = puntos.reduce((acc, p) => acc + p.x * p.x, 0);

  const denominador = n * sumaX2 - sumaX * sumaX;

  if (denominador === 0) return 0;

  return (n * sumaXY - sumaX * sumaY) / denominador;
}

module.exports = { calcularPendiente };