# Arquitectura del Backend CIMHA

Este documento detalla la arquitectura técnica del sistema backend de CIMHA. El proyecto fue migrado de un motor de flujos (n8n) a una arquitectura basada en código (Node.js/Express) para garantizar mayor escalabilidad, control y modularidad.

## Índice

1. [Módulos del Sistema](#1-módulos-del-sistema)
2. [Optimizaciones, Caché y Código Compartido](#2-optimizaciones-caché-y-código-compartido)
3. [Topología de Integraciones Externas](#3-topología-de-integraciones-externas)
4. [Diccionario de Directorios y Archivos](#4-diccionario-de-directorios-y-archivos)
5. [Contratos de API para el Frontend](#5-contratos-de-api-para-el-frontend)
6. [Pendientes](#6-pendientes)
7. [Notas de Seguridad](#7-notas-de-seguridad)
8. [Variables de Entorno](#8-variables-de-entorno)

---

## 1. Módulos del Sistema

### 1.1. Módulo de Reportes (PQRS) ✅
- **Endpoint:** `POST /webhook/correo-reportes`
- **Controladores y Servicios:** `routes/reportes.js`, `services/mailer.js`, `utils/plantillasCorreo.js`
- **Descripción:** Controlador encargado de la recepción de reportes ciudadanos desde el frontend (`reportes.html`). Valida el payload de entrada y orquesta el envío de notificaciones por correo electrónico (interno para CIMHA y acuse de recibo para el ciudadano).
- **Seguridad aplicada:** Se implementó `escapeHtml` en la descripción del reporte para prevenir inyección de código (XSS). Corrección en el mapeo del remitente/asunto.

### 1.2. Módulo de Ingesta (Scraper Urrá) ✅
- **Endpoint:** `POST /webhook/urra-pdf`
- **Controladores y Servicios:** `routes/urra.js`, `services/compartido/baserow.js`
- **Descripción:** Webhook de integración que recibe el `file_id` y la `fecha` provenientes del scraper automatizado (`test_urra.py`). Se encarga de persistir el registro del último reporte hidrológico en la base de datos (Baserow, tabla "UrraBot").
- **Nota de Integración:** Actualmente accionado localmente. Requiere despliegue a producción (URL pública) para habilitar la ingesta automatizada desde GitHub Actions.}
**Nota** (Solo en Local)Se necesita correr el Bakend luego abriri la carpeta e ingresar este comando en la terminar para que el sistema se active python test_urra.py  si no esta el bakend corriendo no funcionara.

### 1.3. Módulo Central: Consulta Hidroclimatológica ✅
Este es el núcleo del sistema, encargado de orquestar la obtención de datos del clima, niveles de ríos y análisis mediante IA. Está dividido en un controlador principal (enrutador) y tres submódulos de procesamiento lógico.

#### A. Controlador Principal y Geocodificación
- **Endpoint:** `POST /webhook/consulta-coordenadas`
- **Archivos:** `routes/consulta.js`, `utils/compartido/normalizarConsulta.js`, `services/compartido/baserow.js`
- **Lógica:** Actúa como el controlador principal. Recibe la petición (`departamento`, `municipio`, `consulta`), normaliza los datos, consulta las coordenadas geográficas (Lat/Long) en Baserow y delega la ejecución al servicio correspondiente según la temporalidad solicitada ("hoy", "mañana" o "semana").

#### B. Servicio de Consulta "Hoy" (Tiempo Real) ✅
- **Archivos Clave:** `services/hoy/openMeteo.js`, `services/compartido/ideam.js`, `services/hoy/googleDrive.js`, `services/compartido/groq.js`, `utils/hoy/armarReporteFinal.js`
- **Lógica:**
  1. Obtiene el clima actual vía Open-Meteo.
  2. Consulta la estación hidrológica correspondiente al municipio y obtiene estaciones río arriba (vía proxy IDEAM).
  3. Extrae y parsea el último reporte de la represa Urrá (PDF vía Google Drive).
  4. Envía los datos crudos a tres prompts separados en la API de Groq (Clima, Estaciones, Urrá) y consolida las respuestas en un único reporte JSON.
- **Contrato de API:** Documentado en `CONTRATO-API-HOY.md` (ver sección 5).
- **Estado:** Probado end-to-end con datos reales. **Frontend conectado y funcionando en producción** (ver sección 5).

#### C. Servicio de Consulta "Mañana" (Pronóstico 12h) ✅
- **Archivos Clave:** `services/manana/openMeteo2.js`, `utils/manana/generarPrediccion.js`, `utils/manana/armarReporteFinal.js`
- **Lógica:**
  1. Obtiene el pronóstico meteorológico para el día siguiente.
  2. Aplica un modelo matemático ligero (**regresión lineal de mínimos cuadrados**) sobre las últimas 12-48 horas de lecturas del IDEAM para proyectar la tendencia del nivel del río.
  3. Genera una única interpretación cualitativa vía IA combinando el clima esperado y la predicción del río.
- **Estado:** Probado end-to-end con datos reales.

#### D. Servicio de Consulta "Semana" (Pronóstico 7 días) ✅
- **Archivos Clave:** `services/semana/openMeteo.js`, `utils/semana/analizarTendenciaClimatica.js`, `utils/semana/armarReporteFinal.js`
- **Lógica:**
  1. Extrae el clima proyectado a 6-7 días.
  2. Reutiliza la función de regresión lineal para analizar la tendencia de probabilidades de lluvia a lo largo de la semana.
  3. Genera una interpretación con IA utilizando lenguaje probabilístico (estrictamente instruido para evitar declaraciones de certeza a largo plazo).
- **Estado:** Construido, **pendiente de prueba end-to-end** con datos reales.

---

## 2. Optimizaciones, Caché y Código Compartido

El backend implementa un sistema robusto en memoria para minimizar latencia y consumo de APIs externas. **Toda caché vive en memoria del proceso de Node — se borra al reiniciar el backend (`node server.js`), y no se comparte entre instancias si en el futuro corre más de un servidor a la vez.**

- **Caché de Estaciones IDEAM (`cacheEstaciones.js`):** Invalidación en lote cada 1 hora. Implementa un mecanismo de "fallback" utilizando el último dato conocido en caso de fallos (ej. error 404 intermitente del proxy de Google Apps Script).
- **Caché de Urrá (`cacheUrra.js`):** Persiste el análisis del PDF por 1 hora o hasta que ingrese un nuevo `file_id`.
- **Caché de Pronósticos (`cacheManana.js` / `cacheSemana.js`):** Caché de resultados consolidados por municipio (1 hora para "mañana", 3 horas para "semana").
- **Limitador de Tasa AI (`groqLimiter.js`):** Algoritmo de encolado que calcula estimaciones de tokens antes de llamar a la API de Groq. Previene el bloqueo por límite de uso (7000 tokens/minuto) pausando peticiones automáticamente. Modelo: `openai/gpt-oss-120b`.
- **Lógica Compartida (`utils/compartido/`):** Se extrajo la matemática pura (`regresionLineal.js`) y la renderización de texto de estaciones (`bloqueEstacionesTexto.js`) para mantener el código DRY (Don't Repeat Yourself).

---

## 3. Topología de Integraciones Externas

```text
[Automatizaciones/Scrapers]
  |
  |-- GitHub Actions (daily.yml) --> test_urra.py --> POST /webhook/urra-pdf

[Servicios Externos consumidos por el Backend]
  |
  |-- Base de Datos: Baserow API (Coordenadas, Registro Urrá, Estaciones)
  |-- Clima: Open-Meteo API
  |-- Ríos: API IDEAM (mediante Google Apps Script Proxy)
  |-- Documentos: Google Drive API (lectura PDF)
  |-- Procesamiento IA: Groq API (modelo openai/gpt-oss-120b)
  |-- Correos: SMTP / Nodemailer (Gmail)
```

---

## 4. Diccionario de Directorios y Archivos

### 4.1. Directorio: `services/compartido/`

**Archivo: `baserow.js`**
**Responsabilidad:** Cliente HTTP del backend hacia la API de Baserow. Centraliza el acceso a las tablas "UrraBot", "Ubicación Geográfica" y "Estaciones Hidrológicas", encapsulando la construcción de URLs, la autenticación por token y el parseo de respuestas.
**Lógica y Reglas:**
- Los identificadores de tablas y campos se definen como constantes y se componen dinámicamente como prefijos `field_<id>` / `filter__field_<id>` según el modo `user_field_names`.
- `crearFilaUrraBot`: envía una petición POST con el `file_id` y la `fecha` del reporte hidrológico para persistirlos como una nueva fila en la tabla "UrraBot".
- `buscarUbicacionGeografica`: ejecuta un GET filtrando por `departamento` y `municipio`, devolviendo la primera coincidencia (registro con Lat/Long) o `null` si no existe.
- `buscarOrdenEstacion`: filtra la tabla de estaciones por departamento/municipio y devuelve el `Orden_Rio` del municipio; lanza una excepción si no hay coincidencia o la fila carece de orden asignado.
- `buscarEstacionesPorOrden`: recupera todas las estaciones cuyo `Orden_Rio` es menor o igual al consultado (es decir, río arriba), base para el análisis hidrológico.
- `buscarUltimoUrraBot`: obtiene el registro más reciente de "UrraBot" ordenando por fecha descendente y normaliza la fila a `{ file_id, fecha }`.
- Todas las peticiones usan autenticación `Token` con la variable de entorno `BASEROW_TOKEN`. Ante un error HTTP de la API se lanza una excepción con el detalle de la respuesta.

**Archivo: `ideam.js`**
**Responsabilidad:** Obtener los datos en vivo (series de nivel) de una estación hidrológica del IDEAM para su posterior procesamiento.
**Lógica y Reglas:**
- El IDEAM bloquea peticiones directas desde servidores externos, por lo que la petición se enruta a través de un proxy de Google Apps Script.
- Se construye la URL del JSON de la estación (`jsonH/<codigoEstacion>.json`) y se envía codificada como parámetro `url` del proxy.
- La función devuelve la respuesta parseada como JSON. Si el proxy responde con error HTTP se lanza una excepción.

**Archivo: `groq.js`**
**Responsabilidad:** Invocar la API de chat de Groq (IA) para generar las interpretaciones de clima, estaciones y Urrá, consolidando en un único cliente los llamados al proveedor de IA.
**Lógica y Reglas:**
- Antes de llamar a la API, estima los tokens del `systemPrompt` + `userPrompt` más un margen de respuesta y reserva un turno en el limitador de tasa (`groqLimiter`) para no exceder el límite por minuto.
- Envía una petición POST a `/chat/completions` con el modelo `openai/gpt-oss-120b`, `temperature: 0` y los mensajes `system`/`user` recibidos.
- Devuelve el contenido textual de `choices[0].message.content`. Ante un error HTTP de la API se lanza una excepción con el detalle.

**Archivo: `groqLimiter.js`**
**Responsabilidad:** Regulador de tasa ("portero" de tokens) que evita agotar el límite de tokens por minuto del plan gratuito de Groq, encolando peticiones en lugar de devolver errores al usuario.
**Lógica y Reglas:**
- Mantiene un contador de tokens usados dentro de una ventana móvil de 1 minuto; el límite operativo es 7000 tokens/min (margen de seguridad bajo el límite real de 8000).
- Las peticiones entrantes se encolan; cuando hay cupo disponible se descuenta de la ventana y se resuelve la promesa del turno.
- Si la ventana se agota, la cola pausa el procesamiento (vía `setTimeout`) el tiempo restante de la ventana antes de seguir.
- `estimarTokens` aproxima los tokens de un texto como `ceil(longitud / 4)`.

**Archivo: `cacheEstaciones.js`**
**Responsabilidad:** Caché en memoria de los datos del IDEAM por estación, con vencimiento en lote y respaldo de último dato conocido.
**Lógica y Reglas:**
- Vigencia del lote: 1 hora, contada desde la PRIMERA estación que ingresó al lote actual. Todas las estaciones del lote vencen juntas, sin importar cuándo se agregaron después.
- Solo se guardan datos válidos y completos: `esDatosValidos` exige que `Hobs.data` sea un arreglo no vacío con al menos un elemento que tenga `Fecha` y `Hobs` no nulo.
- Si los datos recibidos son incompletos o erróneos, no se modifica la caché vigente (se conserva lo previo) y la función devuelve `false`.
- Además se mantiene un respaldo de "último dato conocido" por estación que no vence por tiempo y únicamente se sobreescribe con datos nuevos válidos; se usa como fallback si el IDEAM falla en vivo.

### 4.2. Directorio: `services/hoy/`

**Archivo: `openMeteo.js`**
**Responsabilidad:** Consulta en tiempo real el clima actual de una coordenada geográfica a través de la API gratuita de Open-Meteo, para alimentar el reporte del día actual.
**Lógica y Reglas:**
- Construye una petición GET al endpoint de pronóstico con `latitude` y `longitude`, solicitando variables actuales (`temperature_2m`, `apparent_temperature`, `wind_speed_10m`, `weather_code`, `cloud_cover`), probabilidad de precipitación horaria y máximas/mínimas diarias.
- Restringe la consulta a 1 día de pronóstico (`forecast_days=1`) y usa zona horaria automática.
- La API no requiere autenticación. Devuelve la respuesta parseada como JSON; ante un error HTTP lanza una excepción con el detalle.

**Archivo: `googleDrive.js`**
**Responsabilidad:** Descarga el archivo PDF del reporte de Urrá desde Google Drive para su posterior extracción de texto.
**Lógica y Reglas:**
- Construye la URL de descarga pública de Google Drive (`uc?export=download&id=<fileId>`).
- Realiza una petición GET; si falla, lanza una excepción con el código de estado HTTP.
- Convierte la respuesta a un `Buffer` (binario) y la devuelve para que otras capas procesen el PDF.

**Archivo: `cacheUrra.js`**
**Responsabilidad:** Caché en memoria de los datos del reporte de Urrá y su interpretación generada por la IA, para evitar reprocesar el PDF en cada consulta.
**Lógica y Reglas:**
- Almacena un único registro `{ fileId, datosUrra, interpretacionUrra, timestamp }`.
- Vigencia de 1 hora desde el guardado. Además aplica una invalidación adicional por contenido: si llega un `file_id` distinto al cacheado (reporte nuevo ingresado), la caché se invalida de inmediato, sin importar que la hora no haya transcurrido, para no servir interpretaciones de un reporte ya reemplazado.
- `obtenerUrraDeCache` devuelve `{ datosUrra, interpretacionUrra }` o `null` si no hay caché, el `file_id` cambió o venció el plazo.
- `guardarUrraEnCache` sobrescribe la entrada con un nuevo `timestamp`.

### 4.3. Directorio: `services/manana/`

**Archivo: `openMeteo2.js`**
**Responsabilidad:** Consultar el pronóstico meteorológico para el día siguiente (mañana) a través de la API de Open-Meteo, alimentando el reporte de pronóstico a 12h.
**Lógica y Reglas:**
- Construye una petición GET al endpoint de pronóstico con `latitude`, `longitude` y `forecast_days=2`. Al pedir 2 días, el índice 0 del arreglo `daily` corresponde a hoy y el índice 1 a mañana.
- Solicita variables diarias relevantes: `weather_code`, `cloud_cover_mean`, máximas/mínimas (incluida la aparente), velocidad de viento y probabilidad máxima de precipitación.
- Usa zona horaria automática. La API no requiere autenticación; devuelve la respuesta parseada como JSON y lanza una excepción ante error HTTP.

**Archivo: `cacheManana.js`**
**Responsabilidad:** Caché en memoria del reporte completo de "mañana" (clima + estaciones + interpretación ya generada) por municipio, para evitar re-consultar Groq en consultas repetidas.
**Lógica y Reglas:**
- Clave de caché compuesta por `departamento|municipio` en minúsculas.
- Vigencia de 1 hora: el pronóstico del día siguiente no varía de forma inmediata, por lo que es razonable reutilizar el resultado consolidado en ese lapso.
- `obtenerDeCacheManana` devuelve los datos cacheados o `null` y elimina la entrada si venció; loguea el tiempo restante de vigencia.
- `guardarEnCacheManana` almacena `{ datos, timestamp }` con el momento actual.

### 4.4. Directorio: `services/semana/`

**Archivo: `openMeteo.js`**
**Responsabilidad:** Consulta el pronóstico meteorológico a 7 días a través de la API de Open-Meteo para alimentar el reporte semanal.
**Lógica y Reglas:**
- Construye una petición GET con `forecast_days=7`; el índice 0 de `daily` es hoy y los índices 1 a 6 corresponden a los 6 días siguientes.
- Solicita las mismas variables diarias de pronóstico (código de tiempo, nubosidad media, máximas/mínimas, velocidad del viento y probabilidad máxima de lluvia).
- Usa zona horaria automática; la API no requiere autenticación. Devuelve JSON y lanza una excepción ante un error HTTP.

**Archivo: `cacheSemana.js`**
**Responsabilidad:** Caché en memoria del reporte completo de "semana" (pronóstico de 6 días + estaciones + interpretación) por municipio, para reutilizar resultados consolidados.
**Lógica y Reglas:**
- Clave de caché por `departamento|municipio` en minúsculas.
- Vigencia de 3 horas, más larga que la de "mañana" (1h) porque un pronóstico a 6 días cambia con menor frecuencia que uno de un solo día.
- `obtenerDeCacheSemana` devuelve los datos o `null` y borra la entrada vencida; loguea los minutos restantes de vigencia.
- `guardarEnCacheSemana` almacena `{ datos, timestamp }` con el momento actual.

### 4.5. Directorio: `services/` (raíz)

**Archivo: `mailer.js`**
**Responsabilidad:** Cliente de envío de correos (Nodemailer sobre Gmail) usado exclusivamente por el módulo de Reportes (PQRS) — no forma parte del flujo de consulta hidroclimatológica.
**Lógica y Reglas:**
- Usa credenciales de aplicación de Gmail (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) vía variables de entorno.
- Expone funciones separadas para el correo interno (a CIMHA, con `replyTo` hacia el ciudadano) y el correo de confirmación (al ciudadano que reportó).

### 4.6. Directorio: `utils/compartido/`

**Archivo: `normalizarConsulta.js`**
**Responsabilidad:** Valida y normaliza el payload de entrada del endpoint de consulta (`departamento`, `municipio`, `consulta`).
**Lógica y Reglas:**
- Exige que los 3 campos estén presentes y no vacíos; lanza `Error` con mensaje descriptivo si falta alguno.
- Normaliza el texto de `departamento`/`municipio` capitalizando cada palabra (vía `normalizarTexto`), independientemente de cómo lo haya escrito el usuario.
- Valida que `consulta` sea exactamente `"hoy"`, `"mañana"` o `"semana"` (insensible a mayúsculas, tolerante a espacios); rechaza cualquier otro valor.

**Archivo: `procesarEstacion.js`**
**Responsabilidad:** Transforma la respuesta cruda del IDEAM para una estación en un objeto de estado legible: nivel actual, precipitación actual y tendencia (ascenso/descenso/estable). Es la base compartida por las 3 ramas (hoy/mañana/semana).
**Lógica y Reglas:**
- Filtra lecturas válidas (con `Fecha` y valor no nulo) de las series `Hobs` (nivel) y `Pobs` (precipitación); toma la última lectura de cada una como valor actual.
- Para la tendencia, busca una lectura de referencia ~3 horas antes de la más reciente (o la penúltima disponible si no hay coincidencia exacta) y compara niveles.
- Clasifica el cambio como "estable" si la diferencia absoluta es menor a 0.02m; en caso contrario, "en ascenso" o "en descenso" según el signo.

**Archivo: `agregarEstaciones.js`**
**Responsabilidad:** Consolida el arreglo de estaciones ya procesadas individualmente en un resumen único: bloque de texto legible y determinación de la estación más cercana.
**Lógica y Reglas:**
- Arma un bloque de texto por cada estación válida (nombre, nivel, precipitación, tendencia).
- Filtra solo las estaciones que tienen `nombre_estacion` y `orden_rio` definidos; lanza `Error` si ninguna cumple.
- Determina la "estación más cercana" como la de mayor `orden_rio` (más próxima al punto consultado, río abajo).
- Devuelve `{ estaciones_texto, estaciones_detalle, tendencia_estacion_cercana, nombre_estacion_cercana, cantidad_estaciones }`. Como `estaciones_detalle` conserva el objeto completo de cada estación, cualquier campo adicional (como `.prediccion`, agregado por la rama "mañana"/"semana") pasa intacto sin necesidad de un agregador distinto.

**Archivo: `parsearRespuestaGroq.js`**
**Responsabilidad:** Parsea de forma segura la respuesta JSON devuelta por el modelo de IA (Groq), extrayendo el campo esperado.
**Lógica y Reglas:**
- Intenta `JSON.parse` sobre el texto devuelto por la IA.
- Si el parseo falla, o el campo esperado no existe en el objeto resultante, devuelve el texto de reserva `"Sin información suficiente"` en vez de lanzar una excepción — evita que un formato de respuesta inesperado de la IA rompa el flujo completo de la consulta.

**Archivo: `fechaHora.js`**
**Responsabilidad:** Genera la fecha y hora actuales, formateadas en español, reutilizadas por los 3 armadores de reporte final (hoy/mañana/semana) para evitar duplicar esta lógica.
**Lógica y Reglas:**
- Formatea la fecha con nombres de mes en español (`"21 de agosto de 2026"`).
- Formatea la hora en formato 12 horas con sufijo AM/PM.
- **Fix de zona horaria (sep 2026):** el servidor de Railway corre en UTC, no en hora de Colombia. La versión original usaba `Date.getHours()`/`getDate()` directamente, lo que mostraba la hora del servidor (UTC) en vez de la de Bogotá — un desfase de 5 horas, y ocasionalmente el día equivocado cerca de la medianoche. Se corrigió extrayendo cada componente ya convertido a `America/Bogota` vía `Intl.DateTimeFormat(...).formatToParts()`.

**Archivo: `regresionLineal.js`**
**Responsabilidad:** Provee el cálculo genérico de regresión lineal simple (mínimos cuadrados), usado tanto por la predicción de nivel de estaciones (`utils/manana/generarPrediccion.js`) como por el análisis de tendencia de lluvia semanal (`utils/semana/analizarTendenciaClimatica.js`).
**Lógica y Reglas:**
- Recibe un arreglo de puntos `{x, y}` y devuelve la pendiente de la recta que mejor ajusta esos puntos (método de mínimos cuadrados).
- Devuelve `0` si hay menos de 2 puntos, o si el denominador del cálculo es 0 (todos los valores de `x` son iguales), evitando división por cero.

**Archivo: `bloqueEstacionesTexto.js`**
**Responsabilidad:** Construye el bloque de texto legible por estación (nivel, precipitación, tendencia actual y proyección a 12h) usado dentro de los prompts de IA de las ramas "mañana" y "semana" — ambas necesitan la misma información de estaciones con predicción.
**Lógica y Reglas:**
- Recorre el arreglo de estaciones ya procesadas (con el campo `.prediccion` adjunto).
- Si la predicción está disponible, incluye la tendencia proyectada, la magnitud, y la aclaración de que no considera lluvia futura ni cambios de Urrá.
- Si no está disponible, incluye el mensaje `"Sin información suficiente para predecir cambios"`.

### 4.7. Directorio: `utils/hoy/`

**Archivo: `procesarClima.js`**
**Responsabilidad:** Transforma la respuesta cruda de Open-Meteo (clima actual) en 7 campos limpios y legibles para el reporte de "hoy".
**Lógica y Reglas:**
- Extrae temperatura actual, sensación térmica, velocidad del viento y las temperaturas mínima/máxima del día.
- Busca la probabilidad de precipitación correspondiente a la hora actual (redondeada a la hora más cercana) dentro del arreglo horario de Open-Meteo.
- Traduce el código de clima (estándar WMO) a una descripción en español mediante una tabla de equivalencias, con un ajuste fino: si el código indica "despejado" pero la nubosidad reportada es significativa (>20%), lo reclasifica como "mayormente despejado".

**Archivo: `procesarPdfUrra.js`**
**Responsabilidad:** Extrae el texto del PDF del reporte de Urrá y parsea con expresiones regulares la fila de datos más reciente del embalse (hora, nivel, caudal entrante, caudal turbinas, caudal rebosadero).
**Lógica y Reglas:**
- Usa la librería `pdf-parse` **v2** (clase `PDFParse`, API distinta a versiones anteriores de la misma librería) para extraer el texto plano del PDF.
- Aplica un patrón de expresión regular que captura la hora y 4 valores numéricos con coma decimal (formato del reporte de Urrá).
- Elimina filas duplicadas por hora (el PDF suele repetir la tabla varias veces), ordena de más reciente a más antigua, y devuelve la primera fila con las unidades ya formateadas (metros, m³/s).
- Lanza una excepción si no se encuentra ningún dato horario, útil para detectar si el formato del reporte de Urrá cambió.

**Archivo: `promptsIA.js`**
**Responsabilidad:** Construye los 3 prompts (sistema + usuario) usados por las llamadas a Groq en la rama "hoy": clima, estaciones e hidroeléctrica Urrá.
**Lógica y Reglas:**
- Cada función arma un encabezado de sistema con reglas estrictas: prohibición de cifras/números en el texto de salida, tono comunitario (no narrativo), y JSON válido como única salida permitida.
- El prompt de usuario incluye los datos crudos correspondientes y una tarea de interpretación específica (con ejemplos de frases prohibidas por genéricas).
- Las 3 exigen el mensaje `"Sin información suficiente"` cuando no hay datos de sustancia para interpretar.

**Archivo: `armarReporteFinal.js`**
**Responsabilidad:** Consolida el reporte final de la rama "hoy": clima + estaciones (desglosadas individualmente) + Urrá + las 3 interpretaciones de IA, en un único objeto de respuesta.
**Lógica y Reglas:**
- Obtiene fecha/hora actual vía `utils/compartido/fechaHora.js` (compartida, no duplicada).
- Descompone el arreglo de estaciones en campos indexados (`estacion_1_nombre`, `estacion_1_nivel_actual`, `estacion_2_nombre`, ...) para que el frontend pueda recorrerlos sin parsear un arreglo anidado.
- Ensambla el objeto final con las secciones `clima`, `estaciones` y `urra`, cada una incluyendo su interpretación de IA correspondiente.

### 4.8. Directorio: `utils/manana/`

**Archivo: `procesarClima2.js`**
**Responsabilidad:** Transforma la respuesta cruda de Open-Meteo (pronóstico a 2 días) en los campos del clima esperado para "mañana", usando el índice 1 del arreglo diario.
**Lógica y Reglas:**
- Extrae temperatura mínima/máxima, rango de sensación térmica, viento máximo y probabilidad de lluvia correspondientes al día siguiente (no al actual).
- Traduce el código de clima a descripción en español reutilizando la misma tabla de equivalencias que "hoy".
- *(Nota: el sufijo "2" en el nombre del archivo es solo por una colisión de nombres al crearlo en VS Code — no tiene significado funcional.)*

**Archivo: `generarPrediccion.js`**
**Responsabilidad:** Genera una proyección **estadística simple** (explícitamente, no un modelo hidrológico) de la tendencia de nivel de una estación para las próximas 12 horas, a partir de su historial de lecturas del IDEAM.
**Lógica y Reglas:**
- Filtra lecturas válidas dentro de una ventana temporal reciente.
- **Ventana adaptable:** intenta primero con las últimas 12 horas; si no hay mínimo 2 puntos válidos, amplía a 24h, y si tampoco alcanza, a 48h. Esto tolera estaciones que reportan cada 6-12 horas en vez de cada hora (comportamiento real detectado durante las pruebas, no un supuesto inicial).
- Con mínimo 2 puntos, calcula la pendiente (metros/hora) delegando el cálculo a `utils/compartido/regresionLineal.js`.
- Clasifica la proyección en dirección (ascenso/descenso/estable) y magnitud (leve/moderado/marcado) según umbrales fijos.
- Si ni con la ventana máxima (48h) hay 2 puntos, devuelve `prediccion_disponible: false` con el mensaje exacto `"Sin información suficiente para predecir cambios"`.
- Siempre adjunta una aclaración textual: la proyección no considera lluvia futura ni decisiones de la hidroeléctrica Urrá.

**Archivo: `promptsManana.js`**
**Responsabilidad:** Construye el único prompt (sistema + usuario) de la rama "mañana", combinando el pronóstico del clima del día siguiente con el estado y la proyección del río en una sola interpretación de IA.
**Lógica y Reglas:**
- Arma el bloque de texto de estaciones (con predicción) reutilizando `utils/compartido/bloqueEstacionesTexto.js`.
- El prompt de usuario expone el pronóstico de mañana y el bloque de estaciones; instruye a la IA a conectar ambos (por ejemplo, mencionar si la lluvia esperada podría sumarse a una tendencia de ascenso ya presente).
- Exige de forma obligatoria que la interpretación incluya, de forma natural (no como nota aparte), la aclaración de que la proyección puede cambiar si llueve más de lo esperado o si Urrá modifica sus descargas.

**Archivo: `armarReporteFinal.js`**
**Responsabilidad:** Consolida el reporte final de la rama "mañana": clima del día siguiente + estaciones (con predicción a 12h) + una única interpretación combinada.
**Lógica y Reglas:**
- Estructura idéntica en espíritu a la de "hoy", pero con una sola interpretación (no tres) y agregando, por cada estación, los campos `estacion_N_prediccion_12h` y `estacion_N_magnitud_prediccion` (o el mensaje de información insuficiente).
- Respeta el orden de salida solicitado: `clima` → `estaciones` → `interpretacion`.

### 4.9. Directorio: `utils/semana/`

**Archivo: `procesarClima.js`**
**Responsabilidad:** Transforma la respuesta cruda de Open-Meteo (pronóstico a 7 días) en un arreglo de 6 objetos, uno por cada uno de los días siguientes a hoy.
**Lógica y Reglas:**
- Recorre los índices 1 a 6 del arreglo diario de Open-Meteo (el índice 0, hoy, se descarta).
- Para cada día extrae fecha, temperatura mínima/máxima, sensación térmica, viento máximo, probabilidad de lluvia, y el estado del cielo traducido a español.

**Archivo: `analizarTendenciaClimatica.js`**
**Responsabilidad:** Aplica la regresión lineal compartida a la probabilidad de lluvia de los 6 días del pronóstico semanal, para detectar si la tendencia de lluvia va en aumento, disminución, o se mantiene estable a lo largo de la semana.
**Lógica y Reglas:**
- Exige mínimo 2 días con dato disponible; si no, devuelve `tendencia_disponible: false`.
- Calcula la pendiente (en % de probabilidad de lluvia por día) vía `utils/compartido/regresionLineal.js`, usando el índice del día (0 a 5) como variable independiente.
- Clasifica dirección ("estable" con umbral de 2%/día) y magnitud (leve/moderada/marcada) según la magnitud absoluta de la pendiente.
- **Importante:** esta señal es un insumo adicional para que la IA razone — no constituye, por sí sola, una predicción del nivel del río.

**Archivo: `promptsSemana.js`**
**Responsabilidad:** Construye el único prompt (sistema + usuario) de la rama "semana", combinando el pronóstico día por día, la tendencia de lluvia calculada, y el estado/proyección del río en una sola interpretación de IA.
**Lógica y Reglas:**
- Arma un bloque de texto por cada uno de los 6 días (cielo, temperatura, viento, probabilidad de lluvia).
- Incorpora el resultado de `analizarTendenciaClimatica.js` como texto explicativo dentro del prompt.
- Reutiliza `utils/compartido/bloqueEstacionesTexto.js` para el bloque de estaciones (igual que "mañana").
- **Instrucción explícita y estricta a la IA:** usar lenguaje de posibilidad (`"podría"`, `"es probable que"`) y NUNCA de certeza sobre el comportamiento del río a varios días; incluir de forma obligatoria la aclaración de que la lectura es orientativa y no contempla con precisión la lluvia real ni las decisiones de Urrá.

**Archivo: `armarReporteFinal.js`**
**Responsabilidad:** Consolida el reporte final de la rama "semana": pronóstico de 6 días + estaciones (con predicción a 12h) + una única interpretación combinada.
**Lógica y Reglas:**
- A diferencia de "hoy" y "mañana", el campo `clima` es un **arreglo de 6 objetos** (uno por día) en vez de un único objeto.
- Respeta el mismo orden de salida acordado: `clima` → `estaciones` → `interpretacion`.

### 4.10. Directorio: `utils/` (raíz)

**Archivo: `plantillasCorreo.js`**
**Responsabilidad:** Genera el HTML de los 2 correos del módulo de Reportes (interno para CIMHA y de confirmación al ciudadano) — no forma parte del flujo de consulta hidroclimatológica.
**Lógica y Reglas:**
- Incluye `escapeHtml` para sanear cualquier texto ingresado por el usuario antes de insertarlo en el HTML del correo (previene inyección de HTML/scripts).

---

## 5. Contratos de API para el Frontend

- **`CONTRATO-API-HOY.md`** (en la raíz del proyecto): documenta la forma exacta del JSON de respuesta de la rama "hoy", pensado para que conectar el frontend sea solo cuestión de leer los campos documentados, sin tener que revisar el código del backend.
- **Estado de la conexión (actualizado sep 2026):** el frontend **ya está conectado y consumiendo esta respuesta en producción**. El flujo real es: `consulta.js` guarda el payload en `sessionStorage` (`consultaPendiente`) → `carga-pronostico.js` hace el `POST` a `/webhook/consulta-coordenadas` y guarda la respuesta en `sessionStorage` (`datosPronostico`) → `resultado-del-dia.js` lee ese resultado cacheado y lo renderiza. Ver el `README.md` del repo `front-end-cimha` para el detalle completo de este flujo.
- **Pendiente:** documentar contratos equivalentes para "mañana" y "semana" (la forma es similar, cambiando `clima` a un arreglo en el caso de "semana").

---

## 6. Pendientes

- [x] ~~Conectar el frontend (`consulta.html`, `resultado-del-dia.html`) para que consuma y muestre el reporte real.~~ **Hecho (sep 2026)** — ver sección 5.
- [x] ~~Desplegar el backend a un servidor con URL pública~~ **Hecho** — corriendo en Railway (`back-end-cimha-production.up.railway.app`), frontend en Cloudflare Workers (`front-end-cimha.cimha-app.workers.dev`).
- [x] ~~Corregir la zona horaria de fecha/hora en el reporte~~ **Hecho (sep 2026)** — ver nota en `fechaHora.js`, sección 4.6.
- [ ] Documentar el contrato de API de "mañana" y "semana" (ver sección 5).
- [ ] Investigar la causa raíz de los errores 404 intermitentes del proxy de IDEAM (no siempre falla la misma estación — probablemente un límite de tasa o lentitud del proxy de Google Apps Script; el sistema ya tolera esto con caché de respaldo, pero no se ha resuelto la causa).
- [ ] Quitar el cronómetro temporal de depuración en `routes/consulta.js` (buscar comentarios `// TEMPORAL`) cuando ya no se necesite medir tiempos de respuesta.
- [ ] Decidir si se elimina o se conserva `routes/pruebaUrra.js` (ruta temporal de diagnóstico; su lógica ya está integrada en el flujo real de "hoy", por lo que no es estrictamente necesaria).
- [ ] Probar la rama "semana" end-to-end con datos reales (construida, pero sin confirmar aún, a diferencia de "hoy" y "mañana").
- [ ] En el frontend, `resultado-del-dia.js` conserva una función `cargarDatosBackend()` sin usar (código muerto de una versión anterior que hacía el fetch directamente en esa pantalla). Evaluar si eliminarla para evitar confusión, ya que el fetch real ocurre en `carga-pronostico.js`.
- [ ] Revisar la variable `ALLOWED_ORIGINS` en Railway cada vez que cambie el dominio del frontend: debe coincidir **exactamente** con el `Origin` que manda el navegador (sin `/` al final, sin espacios extra entre orígenes separados por coma). Un error aquí causó una falla de CORS en septiembre 2026.

---

## 7. Notas de Seguridad

- ~~Clave de API de Groq expuesta en texto plano en el JSON exportado del workflow de n8n~~ → **RESUELTO**: se regeneró en console.groq.com/keys y la nueva clave vive únicamente en `.env` (`GROQ_API_KEY`), nunca en el código ni en archivos versionados.

---

## 8. Variables de Entorno

Definidas en `.env` (nunca se sube a control de versiones — ver `.gitignore`):

| Variable | Uso |
|---|---|
| `PORT` | Puerto donde corre el backend |
| `GMAIL_USER` | Cuenta de Gmail que envía los correos del módulo de Reportes |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de Gmail (no la contraseña normal de la cuenta) |
| `CIMHA_INTERNAL_EMAIL` | Correo interno donde llegan los reportes ciudadanos |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS para que el frontend pueda llamar al backend |
| `BASEROW_TOKEN` | Token de autenticación para la API de Baserow |
| `GROQ_API_KEY` | Clave de autenticación para la API de Groq (IA) |