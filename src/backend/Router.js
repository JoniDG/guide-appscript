/**
 * ============================================================================
 *  BACKEND 2: EL ROUTER (QUÉ FUNCIÓN ATIENDE CADA PEDIDO)
 * ============================================================================
 *
 *  doGet y doPost son las dos únicas "puertas de entrada". El router mira
 *  el MÉTODO y la RUTA del pedido y decide qué función lo atiende, igual
 *  que en Express, FastAPI o cualquier framework de backend:
 *
 *      GET    /clientes             -> listarClientes_
 *      GET    /clientes/C00001      -> obtenerCliente_   (id = "C00001")
 *      POST   /clientes             -> crearCliente_
 *      PATCH  /clientes/C00001      -> actualizarCliente_
 *      DELETE /clientes/C00001      -> borrarCliente_
 *
 *  ¿De dónde sale la ruta? De dos lugares posibles:
 *    - Del parámetro "ruta":  .../exec?ruta=clientes/C00001
 *      Es la forma que funciona SIEMPRE, también para visitantes anónimos.
 *    - Del path:              .../exec/clientes/C00001   (e.pathInfo)
 *      Más prolija, pero OJO (comprobado probando): Google solo la deja
 *      pasar si quien llama inició sesión en Google. Un pedido anónimo
 *      (otro sistema, curl, UrlFetchApp, una página de un visitante sin
 *      sesión) es redirigido a la pantalla de login y nunca llega a tu
 *      código. Por eso, en una API pública, usá ?ruta=.
 *  El código original de esta guía ya lo resolvía así, con un parámetro
 *  ?func=saveData en la URL (ver el primer commit del repo). Esta versión
 *  conserva esa idea (?ruta= cumple el mismo papel) y le suma rutas con
 *  parámetros (clientes/:id), métodos, token y un formato de respuesta fijo.
 *
 *  ¿Y PATCH / DELETE, si Apps Script solo tiene GET y POST?
 *  Se mandan como POST con el campo _method: "PATCH" en el cuerpo JSON (o
 *  el parámetro ?_method=PATCH en la URL). Es un truco clásico ("method
 *  override").
 *
 *  CONTRATO DE RESPUESTA: todas las respuestas son JSON con la misma forma.
 *    Éxito: { "ok": true,  "status": 200, "data": ... }
 *    Error: { "ok": false, "status": 404, "error": "mensaje" }
 *  El "status" va adentro del JSON porque Apps Script siempre responde 200
 *  (ver Conceptos.js). El cliente tiene que mirar "ok" o "status".
 *
 *  SEGURIDAD
 *    - Las rutas que escriben datos son privadas y piden el token (la
 *      Propiedad del script API_TOKEN, que crea setup()).
 *    - El token va, de preferencia, en el CUERPO JSON: { "token": "..." }.
 *      También se acepta en la URL (?token=...) para probar rápido, pero una
 *      URL queda guardada en el historial del navegador, en logs de
 *      servidores intermedios y en capturas de pantalla.
 *    - Si el token se filtra: borrá API_TOKEN de las Propiedades del script
 *      y corré setup() para generar uno nuevo.
 *    - Las rutas públicas las puede usar CUALQUIERA. En esta guía las rutas
 *      de lectura de clientes son públicas porque los datos son inventados;
 *      con datos personales reales, NUNCA hagas públicas esas rutas.
 * ============================================================================
 */

/**
 * Error con un código de estado HTTP. Los handlers lo tiran para cortar
 * con un error "controlado" (404, 400...): el router lo convierte en la
 * respuesta { ok: false, status, error }.
 * Cualquier otro error (un bug) se responde como 500.
 */
class HttpError_ extends Error {
  /**
   * @param {number} status
   * @param {string} mensaje
   */
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

/**
 * La tabla de rutas. Está DENTRO de una función (y no en una constante
 * suelta) porque los handlers están definidos en otros archivos, y Apps
 * Script no garantiza el orden en que carga los archivos: en una constante
 * suelta, listarClientes_ podría no existir todavía. Dentro de una función,
 * se arma recién cuando llega un pedido, con todo ya cargado.
 *
 * @returns {Array<{metodo: string, ruta: string, handler: Function, publica: boolean}>}
 */
function rutas_() {
  return [
    { metodo: "GET", ruta: "", handler: indiceDeLaApi_, publica: true },
    {
      metodo: "GET",
      ruta: "clientes",
      handler: listarClientes_,
      publica: true,
    },
    {
      metodo: "GET",
      ruta: "clientes/:id",
      handler: obtenerCliente_,
      publica: true,
    },
    {
      metodo: "POST",
      ruta: "clientes",
      handler: crearCliente_,
      publica: false,
    },
    {
      metodo: "PATCH",
      ruta: "clientes/:id",
      handler: actualizarCliente_,
      publica: false,
    },
    {
      metodo: "DELETE",
      ruta: "clientes/:id",
      handler: borrarCliente_,
      publica: false,
    },
    {
      metodo: "GET",
      ruta: "archivos",
      handler: listarArchivos_,
      publica: false,
    },
    {
      metodo: "POST",
      ruta: "archivos",
      handler: subirArchivo_,
      publica: false,
    },
  ];
}

/**
 * Punto de entrada para los pedidos GET. Google lo llama automáticamente.
 * @param {GoogleAppsScript.Events.DoGet} e
 */
function doGet(e) {
  // ?pagina=... -> una página HTML (tema HTML / UI, ver html/PaginaWeb.js).
  // Cualquier otra cosa -> la API JSON.
  if (e && e.parameter && e.parameter.pagina) {
    return servirPagina_(e.parameter.pagina);
  }
  return manejarPedido_("GET", e);
}

/**
 * Punto de entrada para los pedidos POST. Google lo llama automáticamente.
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
  return manejarPedido_("POST", e);
}

/**
 * Hace todo el trabajo común a GET y POST: leer el pedido, encontrar la
 * ruta, chequear el token, llamar al handler y armar la respuesta JSON.
 *
 * @param {string} metodoHttp  "GET" o "POST".
 * @param {Object} e           El evento que manda Google.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function manejarPedido_(metodoHttp, e) {
  const inicio = Date.now();
  let metodo = metodoHttp;
  let ruta = "";
  let respuesta;

  try {
    const query = e.parameter || {};
    const body = leerCuerpo_(e);
    metodo = metodoReal_(metodoHttp, query, body);
    // Sacamos las barras del principio y del final: "/clientes/" -> "clientes".
    ruta = String(e.pathInfo || query.ruta || "").replace(/^\/+|\/+$/g, "");

    const encontrada = buscarRuta_(metodo, ruta);
    if (!encontrada.publica) {
      verificarToken_(body.token ?? query.token);
    }

    const pedido = { metodo, ruta, params: encontrada.params, query, body };
    const { status = 200, data } = encontrada.handler(pedido);
    respuesta = { ok: true, status, data };
  } catch (error) {
    if (error instanceof HttpError_) {
      respuesta = { ok: false, status: error.status, error: error.message };
    } else {
      // Un error inesperado (un bug): lo logueamos completo para poder
      // arreglarlo, pero al cliente le damos un mensaje genérico (no le
      // mostramos detalles internos del código).
      console.error(`Error inesperado en ${metodo} /${ruta}:`, error.stack);
      respuesta = {
        ok: false,
        status: 500,
        error: "Error interno del servidor",
      };
    }
  }

  // Un log por pedido, SIN datos sensibles (nunca el token ni el cuerpo):
  // se ve en el panel Ejecuciones.
  console.info(
    `${metodo} /${ruta} -> ${respuesta.status} (${Date.now() - inicio} ms)`,
  );
  return ContentService.createTextOutput(JSON.stringify(respuesta)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Interpreta el cuerpo del pedido y lo devuelve como objeto.
 *   - JSON (application/json o text/plain): JSON.parse.
 *   - Formulario (x-www-form-urlencoded): se interpreta el texto del cuerpo.
 *     Ojo: en un formulario TODOS los valores llegan como texto ("123",
 *     "true"), así que campos numéricos o de verdadero/falso conviene
 *     mandarlos por JSON.
 *   - Sin cuerpo: objeto vacío.
 *   - multipart/form-data (archivos de un <form>): Apps Script no lo
 *     interpreta bien, así que lo rechazamos (ver Archivos.js).
 *
 * Aceptamos JSON mandado como text/plain a propósito: es la forma de
 * mandar JSON desde un navegador sin el "preflight" CORS que Apps Script
 * no soporta (ver Conceptos.js).
 *
 * @param {Object} e
 * @returns {Object}
 */
function leerCuerpo_(e) {
  if (!e.postData || !e.postData.contents) {
    return {};
  }
  const tipo = e.postData.type || "";
  if (tipo.includes("application/json") || tipo.includes("text/plain")) {
    let datos;
    try {
      datos = JSON.parse(e.postData.contents);
    } catch (error) {
      throw new HttpError_(400, "El cuerpo no es un JSON válido");
    }
    // "null", "5" o "[1,2]" son JSON válido, pero no son un objeto con
    // campos: los rechazamos para no fallar más adelante.
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
      throw new HttpError_(
        400,
        "El cuerpo tiene que ser un objeto JSON: { ... }",
      );
    }
    return datos;
  }
  if (tipo.includes("application/x-www-form-urlencoded")) {
    // No usamos e.parameter porque mezcla los campos del cuerpo con los de
    // la URL (ruta, token...). Interpretamos solo el cuerpo:
    // "nombre=Ana+Gomez&email=a%40b.com" -> { nombre: "Ana Gomez", email: "a@b.com" }
    return Object.fromEntries(
      e.postData.contents
        .split("&")
        .filter(Boolean)
        .map((par) => {
          const [clave, valor = ""] = par.split("=");
          const decodificar = (texto) =>
            decodificarSeguro_(texto.replace(/\+/g, " "));
          return [decodificar(clave), decodificar(valor)];
        }),
    );
  }
  throw new HttpError_(415, `Tipo de contenido no soportado: ${tipo}`);
}

/**
 * decodeURIComponent, pero sin explotar: si el texto tiene un "%" que no
 * forma un código válido (ej: "100%"), lo devuelve tal cual en lugar de
 * tirar un error (que terminaría en un 500).
 *
 * @param {string} texto
 * @returns {string}
 */
function decodificarSeguro_(texto) {
  try {
    return decodeURIComponent(texto);
  } catch (error) {
    return texto;
  }
}

/**
 * Devuelve el método "real" del pedido, teniendo en cuenta _method.
 *
 * @param {string} metodoHttp
 * @param {Object} query
 * @param {Object} body
 * @returns {string}
 */
function metodoReal_(metodoHttp, query, body) {
  if (metodoHttp !== "POST") {
    return metodoHttp;
  }
  const pedido = String(body._method ?? query._method ?? "POST").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(pedido)) {
    throw new HttpError_(400, `_method inválido: ${pedido}`);
  }
  return pedido;
}

/**
 * Busca la ruta que corresponde al método y path. Las partes que empiezan
 * con ":" son parámetros: "clientes/:id" coincide con "clientes/C00001" y
 * devuelve params = { id: "C00001" }.
 *
 * Si el path existe pero con otro método, responde 405 ("método no
 * permitido"); si no existe, 404.
 *
 * @param {string} metodo
 * @param {string} ruta
 * @returns {{handler: Function, publica: boolean, params: Object}}
 */
function buscarRuta_(metodo, ruta) {
  const partes = ruta === "" ? [] : ruta.split("/");
  let existeConOtroMetodo = false;

  for (const definicion of rutas_()) {
    const patron = definicion.ruta === "" ? [] : definicion.ruta.split("/");
    if (patron.length !== partes.length) {
      continue;
    }
    const params = {};
    const coincide = patron.every((parte, i) => {
      if (parte.startsWith(":")) {
        // Un parámetro puede venir codificado ("Mar%20del%20Plata").
        params[parte.slice(1)] = decodificarSeguro_(partes[i]);
        return true;
      }
      return parte === partes[i];
    });
    if (!coincide) {
      continue;
    }
    if (definicion.metodo === metodo) {
      return {
        handler: definicion.handler,
        publica: definicion.publica,
        params,
      };
    }
    existeConOtroMetodo = true;
  }

  if (existeConOtroMetodo) {
    throw new HttpError_(405, `Método ${metodo} no permitido en /${ruta}`);
  }
  throw new HttpError_(404, `No existe la ruta /${ruta}`);
}

/**
 * Compara el token recibido con el guardado en API_TOKEN.
 *
 * @param {string|undefined} tokenRecibido
 */
function verificarToken_(tokenRecibido) {
  if (!tokenRecibido) {
    throw new HttpError_(401, "Falta el token");
  }
  // ¿Por qué comparamos los HASHES y no los tokens directamente? Una
  // comparación de textos corta en el primer carácter distinto, y en teoría
  // alguien podría medir cuánto tarda la respuesta para ir adivinando el
  // token letra por letra. Comparando hashes, lo único que podría deducir
  // es cuánto se parecen los HASHES, y eso no le sirve para adivinar el
  // token. (En Apps Script, además, la demora variable de cada pedido hace
  // ese ataque casi imposible; es una buena costumbre igual.)
  if (
    sha256Hex_(String(tokenRecibido)) !==
    sha256Hex_(getConfig_(CONFIG_KEYS.API_TOKEN))
  ) {
    throw new HttpError_(403, "Token inválido");
  }
}

/**
 * GET / -> describe la API (las rutas disponibles).
 *
 * @returns {{status: number, data: Object}}
 */
function indiceDeLaApi_() {
  return {
    status: 200,
    data: {
      nombre: "API de ejemplo de la Guía de Apps Script",
      rutas: rutas_().map(
        (r) => `${r.metodo} /${r.ruta}${r.publica ? "" : " (requiere token)"}`,
      ),
    },
  };
}
