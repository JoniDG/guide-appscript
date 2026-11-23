/**
 * ============================================================================
 *  UTILS: HASH, HMAC Y BASE64
 * ============================================================================
 *
 *  HASH
 *  Un hash es una "huella digital" de un texto: una función que convierte
 *  cualquier texto en un código de largo fijo. Propiedades:
 *    - El mismo texto SIEMPRE da el mismo hash.
 *    - Un cambio mínimo en el texto da un hash totalmente distinto.
 *    - No se puede "volver atrás": del hash no se obtiene el texto.
 *  Sirve para: detectar si algo cambió (comparar huellas), detectar
 *  duplicados, generar claves para el cache.
 *  Algoritmos: SHA-256 (el recomendado), SHA-512. MD5 y SHA-1 están "rotos"
 *  para seguridad: usalos solo si una API externa te los exige.
 *
 *  ¿Sirve para guardar contraseñas? No así de simple: las contraseñas
 *  comunes se adivinan probando millones de hashes. Si necesitás manejar
 *  contraseñas, Apps Script no es el lugar.
 *
 *  HMAC
 *  Es un hash que además usa una CLAVE secreta. Solo quien conoce la clave
 *  puede generar el mismo resultado. Se usa para "firmar" mensajes: muchas
 *  APIs (Mercado Pago, Stripe, GitHub, Meta...) mandan una firma HMAC junto
 *  con sus webhooks, y vos la recalculás con tu clave para confirmar que
 *  el mensaje es auténtico y nadie lo modificó.
 *
 *  LÍMITE IMPORTANTE de Apps Script: en doPost(e) NO se pueden leer los
 *  headers (encabezados) del pedido. Y la mayoría de esos servicios manda
 *  la firma justamente en un header (Stripe-Signature, X-Hub-Signature-256,
 *  x-signature...). Por eso, un web app de Apps Script solo puede verificar
 *  la firma si llega en el cuerpo del mensaje o en la URL. Si no, hace
 *  falta un intermediario que reciba el webhook y se lo reenvíe (tema
 *  Backend). HMAC sigue siendo útil para firmar mensajes ENTRE sistemas
 *  tuyos, o para llamar a APIs que piden una firma (tema Requests).
 *
 *  BASE64
 *  NO es encriptación ni hash: es una forma de escribir datos binarios
 *  (una imagen, un PDF, los bytes de un hash) usando solo letras, números
 *  y + / =. Cualquiera lo puede decodificar. Sirve para mandar archivos
 *  dentro de un JSON o de un texto (tema Drive y tema Backend).
 *
 *  BYTES EN APPS SCRIPT
 *  Las funciones de Utilities devuelven listas de bytes con valores de -128
 *  a 127 (no de 0 a 255 como en otros lenguajes). Para pasarlos a
 *  hexadecimal hay que corregir eso: ver bytesAHex_.
 * ============================================================================
 */

/**
 * Convierte una lista de bytes al formato hexadecimal ("a3f09c...").
 *
 * @param {number[]} bytes  Bytes de -128 a 127, como los da Utilities.
 * @returns {string}
 */
function bytesAHex_(bytes) {
  return bytes
    .map((byte) => {
      // (byte + 256) % 256 convierte -128..127 en 0..255.
      // toString(16) lo escribe en hexadecimal; padStart agrega un 0 a la
      // izquierda si quedó de un solo dígito ("a" -> "0a").
      return ((byte + 256) % 256).toString(16).padStart(2, "0");
    })
    .join("");
}

/**
 * Calcula el hash SHA-256 de un texto, en hexadecimal.
 *
 * @param {string} texto
 * @returns {string}  64 caracteres hexadecimales.
 */
function sha256Hex_(texto) {
  // Indicamos UTF_8 para que los acentos y la ñ den el mismo resultado que
  // en cualquier otro lenguaje o herramienta.
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    texto,
    Utilities.Charset.UTF_8,
  );
  return bytesAHex_(bytes);
}

/**
 * Calcula la firma HMAC-SHA256 de un mensaje con una clave, en hexadecimal.
 *
 * @param {string} mensaje
 * @param {string} clave
 * @returns {string}
 */
function hmacSha256Hex_(mensaje, clave) {
  const bytes = Utilities.computeHmacSha256Signature(
    mensaje,
    clave,
    Utilities.Charset.UTF_8,
  );
  return bytesAHex_(bytes);
}

/**
 * DEMO: el mismo texto da el mismo hash; un cambio mínimo da otro totalmente
 * distinto.
 */
function demo_hash() {
  console.log("SHA-256 de 'hola':  ", sha256Hex_("hola"));
  console.log("SHA-256 de 'hola':  ", sha256Hex_("hola"), "(igual)");
  console.log(
    "SHA-256 de 'Hola':  ",
    sha256Hex_("Hola"),
    "(totalmente distinto)",
  );

  // Uso práctico: detectar si el contenido de algo cambió.
  const versionVieja = "precio: 100";
  const versionNueva = "precio: 110";
  console.log(
    "¿Cambió?",
    sha256Hex_(versionVieja) !== sha256Hex_(versionNueva),
  );
}

/**
 * DEMO: verificar la firma de un webhook con HMAC.
 *
 * Simulamos lo que pasa en la realidad:
 *   1. El servicio externo (ej: una pasarela de pagos) y vos comparten una
 *      clave secreta (en la realidad, guardada en las Propiedades del script).
 *   2. El servicio te manda el mensaje + la firma HMAC del mensaje.
 *   3. Vos recalculás la firma con tu clave y comparás.
 */
function demo_verificarFirmaWebhook() {
  const claveSecreta = "clave-de-ejemplo";
  const mensajeRecibido = '{"pago":123,"estado":"aprobado"}';
  const firmaRecibida = hmacSha256Hex_(mensajeRecibido, claveSecreta); // lo que mandaría el servicio

  const firmaCalculada = hmacSha256Hex_(mensajeRecibido, claveSecreta);
  console.log("Firma válida:", firmaCalculada === firmaRecibida);

  // Si alguien modifica el mensaje en el camino, la firma ya no coincide:
  const mensajeAdulterado = '{"pago":123,"estado":"rechazado"}';
  console.log(
    "Firma del mensaje adulterado válida:",
    hmacSha256Hex_(mensajeAdulterado, claveSecreta) === firmaRecibida,
  );
}

/**
 * DEMO: base64 de ida y de vuelta.
 */
function demo_base64() {
  const texto = "Hola, ñandú";

  const codificado = Utilities.base64Encode(texto, Utilities.Charset.UTF_8);
  console.log("En base64:", codificado);

  // base64Decode devuelve bytes; para volver a texto armamos un "Blob"
  // (un paquete de datos) y le pedimos su contenido como texto.
  const bytes = Utilities.base64Decode(codificado);
  console.log(
    "Decodificado:",
    Utilities.newBlob(bytes).getDataAsString("UTF-8"),
  );

  // Variante "web safe": el base64 normal puede incluir los caracteres + y /,
  // que en una URL tienen un significado especial. La variante web safe los
  // cambia por - y _ (el relleno = del final se mantiene).
  // Estos 2 bytes justo generan + y / en base64, así se ve la diferencia:
  const bytesDeEjemplo = [-5, -1];
  console.log("Base64 normal:  ", Utilities.base64Encode(bytesDeEjemplo)); // +/8=
  console.log(
    "Base64 web safe:",
    Utilities.base64EncodeWebSafe(bytesDeEjemplo),
  ); // -_8=
}
