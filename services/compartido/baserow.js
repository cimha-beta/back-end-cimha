// Cliente HTTP de la API de Baserow.

const BASEROW_API_URL = "https://api.baserow.io";

// Tabla "UrraBot" y sus campos.
const TABLA_URRABOT = 1104404;
const CAMPO_FILE_ID = 9816810;
const CAMPO_FECHA = 9825705;

async function crearFilaUrraBot({ fileId, fecha }) {
  const url = `${BASEROW_API_URL}/api/database/rows/table/${TABLA_URRABOT}/?user_field_names=false`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.BASEROW_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      [`field_${CAMPO_FILE_ID}`]: fileId,
      [`field_${CAMPO_FECHA}`]: fecha,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(
      `Baserow respondió con error ${response.status}: ${detalle}`
    );
  }

  return response.json();
}

// Tabla "Ubicación Geográfica" y sus campos.
const TABLA_UBICACION = 1083094;
const CAMPO_DEPARTAMENTO = 9596253;
const CAMPO_MUNICIPIO = 9596259;

async function buscarUbicacionGeografica({ departamento, municipio }) {
  const params = new URLSearchParams({
    user_field_names: "true",
    [`filter__field_${CAMPO_DEPARTAMENTO}__equal`]: departamento,
    [`filter__field_${CAMPO_MUNICIPIO}__equal`]: municipio,
  });

  const url = `${BASEROW_API_URL}/api/database/rows/table/${TABLA_UBICACION}/?${params}`;

  const response = await fetch(url, {
    headers: { Authorization: `Token ${process.env.BASEROW_TOKEN}` },
  });

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(
      `Baserow respondió con error ${response.status}: ${detalle}`
    );
  }

  const data = await response.json();
  return data.results && data.results.length > 0 ? data.results[0] : null;
}

// Tabla "Estaciones Hidrológicas" y sus campos.
const TABLA_ESTACIONES = 1098744;
const CAMPO_ESTACION_DEPARTAMENTO = 9751232;
const CAMPO_ESTACION_MUNICIPIO = 9751243;
const CAMPO_ESTACION_ORDEN = 9751252;

// Obtiene el Orden_Rio del municipio desde la tabla "Ubicación Geográfica".
async function buscarOrdenEstacion({ departamento, municipio }) {
  const ubicacion = await buscarUbicacionGeografica({ departamento, municipio });
  const orden = ubicacion ? Number(ubicacion.Orden_Rio) : NaN;

  if (!ubicacion || ubicacion.Orden_Rio === null || ubicacion.Orden_Rio === "" || Number.isNaN(orden)) {
    throw new Error(
      `El municipio "${municipio}" no tiene Orden_Rio en la tabla Ubicación Geográfica.`
    );
  }

  return {
    departamento: ubicacion.Departamento || departamento,
    municipio: ubicacion.Municipio || municipio,
    orden_consultado: orden,
  };
}

// Trae las estaciones con orden <= al consultado (río arriba).
async function buscarEstacionesPorOrden({ orden_consultado }) {
  const params = new URLSearchParams({
    user_field_names: "true",
    [`filter__field_${CAMPO_ESTACION_ORDEN}__lower_than_or_equal`]: orden_consultado,
  });

  const url = `${BASEROW_API_URL}/api/database/rows/table/${TABLA_ESTACIONES}/?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Token ${process.env.BASEROW_TOKEN}` },
  });

  if (!response.ok) {
    throw new Error(`Baserow (buscador estaciones) respondió con error ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

// Obtiene el registro UrraBot más reciente (fecha descendente).
async function buscarUltimoUrraBot() {
  const params = new URLSearchParams({
    user_field_names: "false",
    size: "1",
    order_by: `-field_${CAMPO_FECHA}`,
  });

  const url = `${BASEROW_API_URL}/api/database/rows/table/${TABLA_URRABOT}/?${params}`;
  const response = await fetch(url, {
    headers: { Authorization: `Token ${process.env.BASEROW_TOKEN}` },
  });

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(`Baserow (UrraBot) respondió con error ${response.status}: ${detalle}`);
  }

  const data = await response.json();
  const fila = data.results && data.results.length > 0 ? data.results[0] : null;

  if (!fila) return null;

  // Con user_field_names=false las claves vienen como field_<id>.
  return {
    file_id: fila[`field_${CAMPO_FILE_ID}`],
    fecha: fila[`field_${CAMPO_FECHA}`],
  };
}

module.exports = {
  crearFilaUrraBot,
  buscarUbicacionGeografica,
  buscarOrdenEstacion,
  buscarEstacionesPorOrden,
  buscarUltimoUrraBot,
};