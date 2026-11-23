/**
 * ============================================================================
 *  REQUESTS 2: PEDIDOS EN PARALELO Y REINTENTOS
 * ============================================================================
 *
 *  EN PARALELO: UrlFetchApp.fetchAll
 *  fetch espera la respuesta antes de seguir. Si hay que hacer 10 pedidos
 *  de 1 segundo cada uno, uno detrás de otro tardan 10 segundos.
 *  fetchAll los manda TODOS A LA VEZ y espera a que vuelvan: tarda
 *  aproximadamente lo que tarde el más lento (~1 segundo).
 *  Recibe una lista de pedidos, cada uno un objeto { url, ...opciones }, y
 *  devuelve las respuestas en el MISMO orden.
 *  Detalles:
 *    - Google no promete por escrito que sean realmente simultáneos, pero
 *      en la práctica lo son: lo medimos en demo_fetchAllVsUnoPorUno.
 *    - Poné muteHttpExceptions: true en CADA pedido. Si no, con que UNO
 *      solo responda 4xx/5xx, fetchAll entero tira error y perdés TODAS
 *      las respuestas, incluso las que salieron bien.
 *
 *  REINTENTOS
 *  En internet, a veces las cosas fallan un momento: el servidor está
 *  sobrecargado (503), nos pide que vayamos más despacio (429), o se cortó
 *  la conexión. Para esos errores "temporales", lo correcto es esperar un
 *  poco y volver a intentar, esperando cada vez MÁS (1 s, 2 s, 4 s...).
 *  Eso se llama "backoff exponencial": si el servidor está saturado, no lo
 *  saturamos más.
 *
 *  ¿Qué errores se reintentan?
 *    SÍ:  429 (demasiados pedidos), 500, 502, 503, 504, errores de conexión.
 *    NO:  400, 401, 403, 404... Son errores de NUESTRO pedido: reintentar
 *         da el mismo error.
 *
 *  OJO con reintentar POSTs: si el servidor SÍ procesó el pedido pero la
 *  respuesta se perdió, reintentar puede crear el pedido DOS veces. Muchas
 *  APIs aceptan un header "Idempotency-Key" (un ID único del pedido) para
 *  evitar duplicados: si llega dos veces la misma clave, lo hacen una sola.
 *
 *  TIEMPO DE ESPERA: UrlFetchApp no permite configurar cuánto esperar una
 *  respuesta. Si el servidor tarda demasiado, Google corta el pedido con un
 *  error (según la experiencia de la comunidad, alrededor de 1 minuto).
 * ============================================================================
 */

/** Códigos de respuesta que vale la pena reintentar. */
const CODIGOS_REINTENTABLES = [429, 500, 502, 503, 504];

/**
 * Hace un pedido y, si falla por un error temporal, lo reintenta esperando
 * cada vez el doble (1 s, 2 s, 4 s...).
 *
 * @param {string} url
 * @param {Object} opciones          Opciones de UrlFetchApp.fetch.
 * @param {number} [maxIntentos=4]   Cantidad máxima de intentos en total.
 * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse}  La última respuesta.
 */
function pedirConReintentos_(url, opciones, maxIntentos = 4) {
  for (let intento = 1; ; intento++) {
    let respuesta = null;
    try {
      respuesta = UrlFetchApp.fetch(url, {
        ...opciones,
        muteHttpExceptions: true,
      });
    } catch (error) {
      // Acá caen los errores de conexión (DNS, tiempo agotado...), que vale
      // la pena reintentar. Pero también otros que NUNCA se van a arreglar
      // solos (una URL inválida, la cuota diaria de UrlFetch agotada): esos
      // los reintentamos igual, perdiendo unos segundos. Para algo más fino,
      // se puede revisar error.message y cortar enseguida en esos casos.
      if (intento >= maxIntentos) {
        throw error;
      }
      console.warn(`Intento ${intento}: error de conexión (${error.message})`);
    }

    if (respuesta !== null) {
      const codigo = respuesta.getResponseCode();
      if (!CODIGOS_REINTENTABLES.includes(codigo) || intento >= maxIntentos) {
        return respuesta;
      }
      // Muchos servidores, al responder 429 o 503, mandan el header
      // "Retry-After" con cuántos segundos esperar. Una versión más completa
      // usaría ese valor en lugar de la espera exponencial.
      console.warn(`Intento ${intento}: código ${codigo}, se reintenta.`);
    }

    // Espera exponencial: 1000 ms * 2^(intento-1) = 1 s, 2 s, 4 s...
    // Más un "jitter" (un poquito al azar) para que, si muchos clientes
    // fallaron a la vez, no reintenten todos exactamente al mismo tiempo.
    const esperaMs =
      1000 * Math.pow(2, intento - 1) + Math.floor(Math.random() * 300);
    Utilities.sleep(esperaMs);
  }
}

/**
 * DEMO (benchmark): 5 pedidos que tardan 1 segundo cada uno, uno por uno
 * vs todos juntos con fetchAll.
 */
function demo_fetchAllVsUnoPorUno() {
  const urls = [1, 2, 3, 4, 5].map((n) => `${HTTPBIN}/delay/1?pedido=${n}`);

  let inicio = Date.now();
  for (const url of urls) {
    UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  }
  console.log(`Uno por uno: ${Date.now() - inicio} ms`);

  inicio = Date.now();
  // Cada pedido es un objeto con la url y sus opciones.
  const pedidos = urls.map((url) => ({ url, muteHttpExceptions: true }));
  const respuestas = UrlFetchApp.fetchAll(pedidos);
  console.log(`Todos juntos con fetchAll: ${Date.now() - inicio} ms`);

  // Las respuestas vienen en el mismo orden que los pedidos.
  respuestas.forEach((r, i) => {
    if (r.getResponseCode() !== 200) {
      console.warn(`Respuesta ${i}: código ${r.getResponseCode()} (httpbin falló)`);
      return;
    }
    const pedido = JSON.parse(r.getContentText()).args.pedido;
    console.log(
      `Respuesta ${i}: código ${r.getResponseCode()}, era el pedido ${pedido}`,
    );
  });
}

/**
 * DEMO: reintentos ante errores temporales y ante errores "nuestros".
 * Tarda unos segundos porque espera entre intentos.
 */
function demo_reintentos() {
  // 503: error temporal. Se reintenta hasta agotar los intentos.
  let inicio = Date.now();
  const temporal = pedirConReintentos_(`${HTTPBIN}/status/503`, {}, 3);
  console.log(
    `503 -> código final ${temporal.getResponseCode()} tras ${Date.now() - inicio} ms (3 intentos)`,
  );

  // 404: error nuestro. NO se reintenta: vuelve enseguida.
  inicio = Date.now();
  const nuestro = pedirConReintentos_(`${HTTPBIN}/status/404`, {}, 3);
  console.log(
    `404 -> código ${nuestro.getResponseCode()} tras ${Date.now() - inicio} ms (sin reintentos)`,
  );

  // httpbin puede devolver un código al azar de una lista: a veces falla y
  // a veces no, como un servidor inestable de verdad.
  const inestable = pedirConReintentos_(`${HTTPBIN}/status/503,200`, {}, 4);
  console.log(
    "Servidor inestable -> código final:",
    inestable.getResponseCode(),
  );
}
