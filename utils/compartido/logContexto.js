// Logs ordenados por consulta.
//
// Node atiende varias peticiones a la vez, así que sus console.log se
// mezclan en Railway. Este módulo le pone a CADA línea el número de su
// petición (y, cuando se sabe, el municipio y el tipo de consulta), por
// ejemplo:
//
//   [#4 Cereté · hoy] ✅ Valencia: nivel 1.79, tendencia En Desenso
//
// Así se puede filtrar por "#4" en Railway y leer una consulta completa de
// principio a fin, aunque otras estén corriendo al mismo tiempo.
// No hace falta cambiar los console.log existentes: se les agrega el
// prefijo automáticamente (también a cada línea de los objetos multilínea).

const { AsyncLocalStorage } = require("node:async_hooks");
const util = require("node:util");

const almacen = new AsyncLocalStorage();
let contadorPeticiones = 0;
let instalado = false;

function instalarPrefijoEnLogs() {
  if (instalado) return;
  instalado = true;

  for (const metodo of ["log", "info", "warn", "error"]) {
    const original = console[metodo].bind(console);

    console[metodo] = (...args) => {
      const contexto = almacen.getStore();
      if (!contexto) return original(...args); // logs fuera de una petición, sin cambios

      const prefijo = `[#${contexto.id}${contexto.etiqueta ? ` ${contexto.etiqueta}` : ""}]`;
      const texto = util.format(...args);
      return original(
        texto
          .split("\n")
          .map((linea) => `${prefijo} ${linea}`)
          .join("\n")
      );
    };
  }
}

// Middleware: asigna un número a cada petición y registra una sola línea de
// acceso. Debe ir DESPUÉS de cors() y express.json() (el preflight OPTIONS ya
// lo responde cors, por eso no ensucia el log).
function middlewareContextoPeticion(req, res, next) {
  contadorPeticiones += 1;
  const contexto = { id: contadorPeticiones, etiqueta: "" };

  almacen.run(contexto, () => {
    const origen = req.headers.origin || "sin Origin";
    console.log(`📨 ${req.method} ${req.originalUrl} | Origin: ${origen}`);
    next();
  });
}

// Agrega al prefijo de la petición actual algo como "Cereté · hoy".
function etiquetarPeticion(texto) {
  const contexto = almacen.getStore();
  if (contexto) contexto.etiqueta = texto;
}

module.exports = { instalarPrefijoEnLogs, middlewareContextoPeticion, etiquetarPeticion };
