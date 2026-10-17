require("dotenv").config();

const express = require("express");
const cors = require("cors");

const reportesRouter = require("./routes/reportes");
const urraRouter = require("./routes/urra");
const consultaRouter = require("./routes/consulta");
const pruebaUrraRouter = require("./routes/pruebaUrra");
const { instalarPrefijoEnLogs, middlewareContextoPeticion } = require("./utils/compartido/logContexto");

// Cada línea de log llevará el número de su petición (ver logContexto.js).
instalarPrefijoEnLogs();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que el frontend (tus HTML) le hable a este backend
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");
app.use(cors({ origin: allowedOrigins }));

// Permite leer JSON en el cuerpo de las peticiones (req.body)
app.use(express.json());

// Número de petición + una línea de acceso. Va después de cors y json para que
// el preflight OPTIONS (que responde cors) no aparezca en los logs.
app.use(middlewareContextoPeticion);

// Todas las rutas de webhooks viven bajo /webhook
app.use("/webhook", reportesRouter);
app.use("/webhook", urraRouter);
app.use("/webhook", consultaRouter);
app.use("/webhook", pruebaUrraRouter);

// Ruta simple para comprobar que el servidor está vivo
app.get("/", (req, res) => {
  res.send("Backend de CIMHA funcionando ✅");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});