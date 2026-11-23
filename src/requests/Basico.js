/**
 * ============================================================================
 *  REQUESTS 1: PEDIDOS HTTP CON URLFETCHAPP
 * ============================================================================
 *
 *  ¿Qué es un "request" (pedido) HTTP?
 *  Es la forma en que dos sistemas se hablan por internet. Tu código le
 *  manda un pedido a una URL ("dame los datos del cliente 5", "guardá este
 *  pedido") y el otro sistema contesta con una RESPUESTA. Así funcionan las
 *  APIs: la de Mercado Pago, la de WhatsApp, la de tu propio backend.
 *
 *  Un pedido tiene:
 *    - Un MÉTODO, que dice qué queremos hacer:
 *        GET    -> leer / consultar        POST   -> crear / enviar
 *        PUT    -> reemplazar              PATCH  -> modificar una parte
 *        DELETE -> borrar
 *    - Una URL, con "parámetros de consulta" opcionales después del ?:
 *        https://api.ejemplo.com/clientes?ciudad=Salta&limite=10
 *    - HEADERS (encabezados): datos extra sobre el pedido, como el tipo de
 *      contenido o la clave para autenticarse.
 *    - Un CUERPO (body / payload), opcional: los datos que mandamos (en POST,
 *      PUT, PATCH). Casi siempre en formato JSON.
 *
 *  La respuesta tiene:
 *    - Un CÓDIGO de estado (status code), un número que resume el resultado:
 *        2xx -> salió bien     (200 OK, 201 creado, 204 sin contenido)
 *        3xx -> redirección    (el recurso está en otra URL)
 *        4xx -> error NUESTRO  (400 pedido mal armado, 401 sin autenticar,
 *                               403 sin permiso, 404 no existe, 429 demasiados
 *                               pedidos)
 *        5xx -> error DEL SERVIDOR (500 error interno, 503 no disponible)
 *    - Headers de respuesta.
 *    - Un cuerpo: casi siempre JSON (texto), a veces un archivo.
 *
 *  En Apps Script todo esto se hace con UrlFetchApp.fetch(url, opciones).
 *
 *  LA OPCIÓN MÁS IMPORTANTE: muteHttpExceptions: true
 *  Sin ella, cualquier respuesta 4xx o 5xx TIRA UN ERROR, y de lo que
 *  contestó el servidor (que suele explicar el problema) solo vemos un
 *  pedazo recortado dentro del mensaje de error. Con ella, la respuesta
 *  llega siempre completa, y nosotros miramos el código. Recomendación:
 *  usarla SIEMPRE.
 *
 *  Para probar usamos https://httpbin.org, un servicio público y gratuito
 *  que devuelve lo que le mandás (sirve para ver exactamente qué envió tu
 *  código). Si algún demo falla con 502/503, es httpbin que está caído un
 *  rato: probá de nuevo más tarde.
 * ============================================================================
 */

/** URL base del servicio de pruebas. */
const HTTPBIN = "https://httpbin.org";

/**
 * Arma una URL con parámetros de consulta, codificándolos bien.
 * construirUrl_("https://x.com/buscar", { q: "café con leche", n: 5 })
 *   -> "https://x.com/buscar?q=caf%C3%A9%20con%20leche&n=5"
 *
 * encodeURIComponent convierte los caracteres "raros" (espacios, acentos,
 * &, =, ?) para que no rompan la URL. Sin esto, un "&" dentro de un valor
 * se confundiría con el separador de parámetros.
 *
 * @param {string} base
 * @param {Object} parametros
 * @returns {string}
 */
function construirUrl_(base, parametros) {
  const query = Object.entries(parametros)
    .map(
      ([clave, valor]) =>
        `${encodeURIComponent(clave)}=${encodeURIComponent(valor)}`,
    )
    .join("&");
  return query ? `${base}?${query}` : base;
}

/**
 * Hace un pedido y devuelve la respuesta ya interpretada:
 *   { status, ok, headers, body }
 * donde body es el JSON ya convertido en objeto (o el texto, si no era
 * JSON). Es el "envoltorio" que conviene usar en cualquier proyecto.
 *
 * @param {string} url
 * @param {Object} [opciones]  Las mismas opciones que UrlFetchApp.fetch.
 * @returns {{status: number, ok: boolean, headers: Object, body: *}}
 */
function pedirJson_(url, opciones = {}) {
  const respuesta = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    ...opciones,
  });
  const status = respuesta.getResponseCode();
  const texto = respuesta.getContentText();

  let body = texto;
  try {
    body = JSON.parse(texto);
  } catch (error) {
    // No era JSON (por ejemplo, una página HTML de error): dejamos el texto.
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: respuesta.getHeaders(),
    body,
  };
}

/**
 * DEMO: un GET con parámetros, y todo lo que trae la respuesta.
 */
function demo_get() {
  const url = construirUrl_(`${HTTPBIN}/get`, {
    ciudad: "Mar del Plata",
    limite: 10,
  });
  console.log("URL pedida:", url);

  const respuesta = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  console.log("Código:", respuesta.getResponseCode());
  // El tipo de contenido se puede leer de los headers, pero sus nombres
  // pueden venir en mayúsculas o minúsculas ("Content-Type" o "content-type")
  // según el servidor. El Blob de la respuesta lo da sin ese problema.
  console.log("Tipo de contenido:", respuesta.getBlob().getContentType());
  console.log("Headers de la respuesta:", JSON.stringify(respuesta.getHeaders()));

  // Antes de interpretar el cuerpo, chequeamos que haya salido bien: si el
  // servidor falla, suele devolver una página HTML y JSON.parse explotaría
  // con un error confuso.
  if (respuesta.getResponseCode() !== 200) {
    throw new Error(`El servidor respondió ${respuesta.getResponseCode()}`);
  }
  // getContentText() devuelve el cuerpo como texto; JSON.parse lo convierte
  // en un objeto de JavaScript para poder usar sus campos.
  const datos = JSON.parse(respuesta.getContentText());
  console.log(
    "Parámetros que recibió el servidor:",
    JSON.stringify(datos.args),
  );
  // httpbin nos muestra qué User-Agent manda Apps Script: así se presenta
  // ante los servidores (algunos bloquean este User-Agent).
  console.log("User-Agent de Apps Script:", datos.headers["User-Agent"]);
}

/**
 * DEMO: POST mandando JSON, la forma más común de "enviar datos" a una API.
 */
function demo_postJson() {
  const pedido = {
    cliente: "C00001",
    items: [{ producto: "Manzana", cantidad: 3 }],
    total: 3600,
  };

  const respuesta = pedirJson_(`${HTTPBIN}/post`, {
    method: "post",
    // contentType le avisa al servidor que el cuerpo es JSON.
    contentType: "application/json",
    // payload es el cuerpo. Un objeto hay que convertirlo a texto JSON.
    payload: JSON.stringify(pedido),
  });

  console.log("Código:", respuesta.status, "| ¿ok?", respuesta.ok);
  // httpbin devuelve en "json" lo que recibió, ya interpretado.
  console.log("El servidor recibió:", JSON.stringify(respuesta.body.json));
}

/**
 * DEMO: POST como formulario y POST con un archivo adjunto.
 *
 * Si "payload" es un OBJETO (no un texto), Apps Script lo manda como
 * formulario (application/x-www-form-urlencoded), igual que un <form> HTML.
 * Si alguno de sus valores es un Blob, lo manda como multipart/form-data:
 * el formato para subir archivos.
 */
function demo_postFormularioYArchivo() {
  const formulario = pedirJson_(`${HTTPBIN}/post`, {
    method: "post",
    payload: { nombre: "Ana", edad: "30" },
  });
  console.log("Formulario recibido:", JSON.stringify(formulario.body.form));

  const archivo = Utilities.newBlob(
    "contenido del archivo",
    MimeType.PLAIN_TEXT,
    "nota.txt",
  );
  const conArchivo = pedirJson_(`${HTTPBIN}/post`, {
    method: "post",
    payload: { descripcion: "un adjunto", archivo: archivo },
  });
  console.log("Campos de texto:", JSON.stringify(conArchivo.body.form));
  console.log("Archivos recibidos:", JSON.stringify(conArchivo.body.files));
}

/**
 * DEMO: los otros métodos (PUT, PATCH, DELETE) y cómo se ven los errores.
 */
function demo_otrosMetodosYErrores() {
  for (const metodo of ["put", "patch"]) {
    const r = pedirJson_(`${HTTPBIN}/${metodo}`, {
      method: metodo,
      contentType: "application/json",
      payload: JSON.stringify({ id: 5 }),
    });
    const recibido = JSON.stringify(r.body.json);
    console.log(`${metodo.toUpperCase()} -> ${r.status}, recibió ${recibido}`);
  }
  // DELETE normalmente va SIN cuerpo: lo que se borra se indica en la URL
  // (ej: DELETE /clientes/5). Algunos servidores rechazan un DELETE con cuerpo.
  const borrado = pedirJson_(`${HTTPBIN}/delete?id=5`, { method: "delete" });
  console.log(`DELETE -> ${borrado.status}`);

  // Con muteHttpExceptions (que pedirJson_ pone siempre), un 404 NO tira
  // error: lo vemos en el código.
  const noExiste = pedirJson_(`${HTTPBIN}/status/404`);
  console.log(
    "Pedido a algo que no existe -> código",
    noExiste.status,
    "| ¿ok?",
    noExiste.ok,
  );

  // SIN muteHttpExceptions, el mismo pedido tira una excepción.
  try {
    UrlFetchApp.fetch(`${HTTPBIN}/status/404`);
  } catch (error) {
    console.log("Sin muteHttpExceptions tira error:", error.message);
  }
}

/**
 * DEMO: descargar un archivo de internet y guardarlo en Drive.
 */
function demo_descargarArchivo() {
  const respuesta = UrlFetchApp.fetch(`${HTTPBIN}/image/png`, {
    muteHttpExceptions: true,
  });
  if (respuesta.getResponseCode() !== 200) {
    throw new Error(
      `No se pudo descargar (código ${respuesta.getResponseCode()})`,
    );
  }
  // getBlob(): la respuesta como archivo (ver drive/Blobs.js).
  const blob = respuesta.getBlob().setName("descargada.png");
  const archivo = carpetaDeDemos_().createFile(blob);
  console.log(
    `Guardada en Drive: ${archivo.getUrl()} (${archivo.getSize()} bytes)`,
  );
}
