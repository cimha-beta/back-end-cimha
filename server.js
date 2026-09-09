require("dotenv").config();

const express = require("express");
const cors = require("cors");

const reportesRouter = require("./routes/reportes");
const urraRouter = require("./routes/urra");
const consultaRouter = require("./routes/consulta");
const pruebaUrraRouter = require("./routes/pruebaUrra");

const app = express();
const PORT = process.env.PORT || 3000;

// TEMPORAL (diagnóstico): registra TODA petición que llega al backend en el terminal.
// Sirve para confirmar si la duplicación que ves (2 logs iguales por 1 consulta) es
// porque el servidor recibe 2 HTTP requests reales (POST duplicado), un preflight de
// CORS (OPTIONS, normal), o algo más. Quitar cuando ya no se necesite.
let contadorDiagnostico = 0;
app.use((req, res, next) => {
  contadorDiagnostico += 1;
  const origen = req.headers.origin || "(sin Origin: Postman/curl/misma app)";
  console.log(
    `[DIAG #${contadorDiagnostico}] ${new Date().toLocaleTimeString()} ` +
      `${req.method} ${req.originalUrl} | IP ${req.ip} | Origin: ${origen}`
  );
  return next();
});

// Permite que el frontend (tus HTML) le hable a este backend
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");
app.use(cors({ origin: allowedOrigins }));

// Permite leer JSON en el cuerpo de las peticiones (req.body)
app.use(express.json());

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