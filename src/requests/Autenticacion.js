/**
 * ============================================================================
 *  REQUESTS 3: AUTENTICACIÓN (CÓMO DECIRLE A UNA API QUIÉN SOS)
 * ============================================================================
 *
 *  Casi todas las APIs piden algo que demuestre que tenés permiso. Las
 *  formas más comunes:
 *
 *  1. API KEY: una clave fija que te da el servicio. Se manda en un header
 *     (lo más común, ej: "x-api-key: abc123") o en la URL (?key=abc123).
 *
 *  2. BEARER TOKEN: un "pase" que se manda en el header
 *        Authorization: Bearer <token>
 *     Puede ser fijo (como una API key) o temporal (OAuth2, ver abajo).
 *
 *  3. BASIC: usuario y contraseña, unidos con ":" y en base64, en el header
 *        Authorization: Basic <base64 de "usuario:contraseña">
 *     Base64 NO es encriptación: solo es seguro sobre https.
 *
 *  4. OAUTH2: el usuario autoriza a tu app a usar su cuenta de OTRO servicio
 *     (por ejemplo, su cuenta de Spotify o de Dropbox), y el servicio te da
 *     un token temporal. Implementarlo a mano es largo; para eso existe la
 *     biblioteca oficial "OAuth2 for Apps Script" (tema Avanzado).
 *
 *  5. APIs DE GOOGLE: no hace falta nada de lo anterior. ScriptApp.
 *     getOAuthToken() da un token con los permisos que el usuario ya le dio
 *     al script (lo usamos en drive/Convertir.js para exportar).
 *
 *  REGLA DE ORO: las claves y tokens van en las Propiedades del script
 *  (ver config/Config.js), NUNCA escritos en el código.
 * ============================================================================
 */

/**
 * DEMO: API key en un header y Bearer token. httpbin nos devuelve los
 * headers que recibió, así vemos exactamente qué mandamos.
 */
function demo_apiKeyYBearer() {
  // IMPORTANTE: en estos demos usamos claves INVENTADAS a propósito.
  // httpbin.org es un servicio público que devuelve (y nosotros logueamos)
  // todo lo que le mandamos: nunca le mandes una clave real. Con una API
  // real, la clave se leería de las Propiedades del script:
  //   const apiKey = getConfig_("MI_API_KEY");
  // y nunca se imprimiría en el log.
  const apiKey = "clave-inventada-123";
  const conApiKey = pedirJson_(`${HTTPBIN}/headers`, {
    headers: { "X-Api-Key": apiKey },
  });
  console.log(
    "Header recibido por el servidor:",
    conApiKey.body.headers["X-Api-Key"],
  );

  // /bearer devuelve 200 si llega un "Authorization: Bearer ...", y 401 si no.
  const token = "token-inventado-456";
  const conToken = pedirJson_(`${HTTPBIN}/bearer`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Con token ->", conToken.status, JSON.stringify(conToken.body));

  const sinToken = pedirJson_(`${HTTPBIN}/bearer`);
  console.log("Sin token ->", sinToken.status, "(401 = no autenticado)");
}

/**
 * DEMO: autenticación Basic (usuario y contraseña).
 * httpbin /basic-auth/<usuario>/<contraseña> acepta solo esa combinación.
 */
function demo_basicAuth() {
  const usuario = "ana";
  const clave = "secreto";
  const credenciales = Utilities.base64Encode(`${usuario}:${clave}`);

  const correcta = pedirJson_(`${HTTPBIN}/basic-auth/${usuario}/${clave}`, {
    headers: { Authorization: `Basic ${credenciales}` },
  });
  console.log(
    "Clave correcta ->",
    correcta.status,
    JSON.stringify(correcta.body),
  );

  const incorrecta = pedirJson_(`${HTTPBIN}/basic-auth/${usuario}/${clave}`, {
    headers: {
      Authorization: `Basic ${Utilities.base64Encode(`${usuario}:otra`)}`,
    },
  });
  console.log("Clave incorrecta ->", incorrecta.status);
}

/**
 * DEMO: firmar un pedido con HMAC (ver utils/Hash.js).
 *
 * Algunas APIs (por ejemplo, de exchanges o de pagos) piden que firmes
 * cada pedido: calculás un HMAC del cuerpo (y a veces de la fecha) con tu
 * clave secreta, y lo mandás en un header. El servidor recalcula la firma
 * y, si no coincide, rechaza el pedido.
 */
function demo_pedidoFirmado() {
  // Secreto inventado (ver la advertencia en demo_apiKeyYBearer).
  const secreto = "secreto-inventado-789";
  const cuerpo = JSON.stringify({ operacion: "consulta", monto: 100 });
  // La fecha dentro de la firma evita que alguien "repita" un pedido viejo.
  const fecha = String(Date.now());
  const firma = hmacSha256Hex_(`${fecha}.${cuerpo}`, secreto);

  const respuesta = pedirJson_(`${HTTPBIN}/post`, {
    method: "post",
    contentType: "application/json",
    headers: { "X-Fecha": fecha, "X-Firma": firma },
    payload: cuerpo,
  });
  console.log("Headers de firma enviados:", respuesta.body.headers["X-Firma"]);
}

/**
 * DEMO: llamar directamente a una API REST de Google con el token del
 * usuario. Usamos la API de Drive para preguntar quién sos y cuánto
 * espacio usás.
 *
 * Esto sirve para usar funciones de las APIs de Google que el servicio
 * "simple" (DriveApp, SpreadsheetApp...) no tiene.
 */
function demo_apiDeGoogleConToken() {
  const respuesta = pedirJson_(
    "https://www.googleapis.com/drive/v3/about?fields=user(displayName),storageQuota(usage,limit)",
    { headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` } },
  );
  if (!respuesta.ok) {
    throw new Error(
      `La API de Drive respondió ${respuesta.status}: ${JSON.stringify(respuesta.body)}`,
    );
  }
  const { user, storageQuota } = respuesta.body;
  const aGB = (bytes) => (Number(bytes) / 1024 ** 3).toFixed(2);
  console.log("Usuario:", user.displayName);
  console.log(
    `Espacio usado: ${aGB(storageQuota.usage)} GB de ${storageQuota.limit ? `${aGB(storageQuota.limit)} GB` : "(sin límite)"}`,
  );
}
