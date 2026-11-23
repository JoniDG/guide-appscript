/**
 * ============================================================================
 *  BACKEND 5: PROBAR LA API
 * ============================================================================
 *
 *  Dos formas de probar:
 *
 *  1. SIMULANDO pedidos (demo_simularPedidos): armamos a mano un objeto
 *     "e" igual al que mandaría Google y llamamos a doGet / doPost
 *     directamente. No hace falta publicar nada: ideal mientras se
 *     programa. Ojo: no prueba lo que hace Google ANTES de llamar a tu
 *     función (redirecciones, permisos de acceso).
 *
 *  2. CONTRA LA API PUBLICADA (demo_probarApiPublicada): hace pedidos HTTP
 *     reales a la URL del web app. Requiere publicarla (ver Conceptos.js)
 *     y guardar la URL .../exec en la Propiedad del script WEBAPP_URL.
 *
 *  Desde una terminal, con curl. -L sigue la redirección de Google; NO
 *  agregues "-X POST": con -L, curl repetiría el POST en la redirección y
 *  fallaría (con -d, curl ya sabe que es un POST):
 *    curl -L "https://script.google.com/macros/s/<ID>/exec/clientes?ciudad=Salta&limite=2"
 *    curl -L -H "Content-Type: text/plain" \
 *         -d '{"token":"<TOKEN>","nombre":"Ana Test","email":"ana.test@example.com"}' \
 *         "https://script.google.com/macros/s/<ID>/exec/clientes"
 *
 *  El recorrido de prueba borra al final lo que crea (el cliente y el
 *  archivo subido).
 * ============================================================================
 */

/**
 * Arma un objeto "e" como el que manda Google, para simular un pedido.
 * En el real, los valores de los parámetros son SIEMPRE texto, aunque sean
 * números: los convertimos con String para ser fieles.
 *
 * @param {string} ruta
 * @param {Object} [parametros]  Parámetros de la URL.
 * @param {Object} [cuerpo]      Cuerpo JSON (solo para POST).
 * @returns {Object}
 */
function eventoSimulado_(ruta, parametros = {}, cuerpo = undefined) {
  const parameter = Object.fromEntries(
    Object.entries(parametros).map(([k, v]) => [k, String(v)]),
  );
  const e = {
    pathInfo: ruta,
    parameter,
    parameters: Object.fromEntries(
      Object.entries(parameter).map(([k, v]) => [k, [v]]),
    ),
    queryString: construirUrl_("", parameter).replace(/^\?/, ""),
    contentLength: -1,
  };
  if (cuerpo !== undefined) {
    const contents = JSON.stringify(cuerpo);
    // length en BYTES: los acentos ocupan más de un byte en UTF-8.
    const length = Utilities.newBlob(contents).getBytes().length;
    e.postData = { contents, type: "text/plain", length, name: "postData" };
    e.contentLength = length;
  }
  return e;
}

/**
 * Muestra una respuesta de forma compacta en el log.
 * @param {string} titulo
 * @param {Object} respuesta  El JSON ya interpretado.
 */
function mostrarRespuesta_(titulo, respuesta) {
  const resumen = respuesta.ok
    ? JSON.stringify(respuesta.data)
    : respuesta.error;
  // Recortamos las respuestas largas para que el log se lea.
  const corto = resumen.length > 300 ? `${resumen.slice(0, 300)}...` : resumen;
  console.log(`${titulo} -> ${respuesta.status} ${corto}`);
}

/**
 * Corre el recorrido completo de la API usando una función que hace los
 * pedidos. Así el mismo recorrido sirve para simular y para probar de verdad.
 *
 * @param {(metodo: string, ruta: string, parametros: Object, cuerpo?: Object) => Object} pedir
 */
function recorridoDePrueba_(pedir) {
  const token = getConfig_(CONFIG_KEYS.API_TOKEN);

  mostrarRespuesta_("GET /", pedir("GET", ""));
  mostrarRespuesta_(
    "GET /clientes (salta, 2 por página)",
    pedir("GET", "clientes", { ciudad: "salta", limite: 2 }),
  );
  mostrarRespuesta_("GET /clientes/C00001", pedir("GET", "clientes/C00001"));
  mostrarRespuesta_(
    "GET /clientes/NOEXISTE",
    pedir("GET", "clientes/NOEXISTE"),
  );
  mostrarRespuesta_("GET /productos", pedir("GET", "productos"));

  const nuevo = {
    nombre: "Cliente de Prueba",
    email: `prueba.${generarCodigoCorto_(6).toLowerCase()}@example.com`,
    ciudad: "Salta",
  };
  mostrarRespuesta_(
    "POST /clientes SIN token",
    pedir("POST", "clientes", {}, nuevo),
  );
  mostrarRespuesta_(
    "POST /clientes token incorrecto",
    pedir("POST", "clientes", {}, { ...nuevo, token: "otro" }),
  );
  mostrarRespuesta_(
    "POST /clientes datos inválidos",
    pedir(
      "POST",
      "clientes",
      {},
      { token, nombre: "A", email: "no-es-email", monto: -5 },
    ),
  );

  // El token va en el CUERPO (la forma recomendada).
  const creado = pedir("POST", "clientes", {}, { ...nuevo, token });
  mostrarRespuesta_("POST /clientes", creado);
  if (!creado.ok) {
    return;
  }
  const id = creado.data.id;
  mostrarRespuesta_(
    "POST /clientes (email repetido)",
    pedir("POST", "clientes", {}, { ...nuevo, token }),
  );
  mostrarRespuesta_(
    `PATCH /clientes/${id}`,
    pedir(
      "POST",
      `clientes/${id}`,
      {},
      { token, _method: "PATCH", monto: 1234.5, activo: false },
    ),
  );
  mostrarRespuesta_(
    `PUT /clientes/${id} (método no permitido)`,
    pedir("POST", `clientes/${id}`, {}, { token, _method: "PUT" }),
  );
  // También se acepta el token en la URL, para probar rápido (no recomendado).
  mostrarRespuesta_(
    `DELETE /clientes/${id} (token en la URL)`,
    pedir("POST", `clientes/${id}`, { token, _method: "DELETE" }, {}),
  );
  mostrarRespuesta_(
    `GET /clientes/${id} (ya borrado)`,
    pedir("GET", `clientes/${id}`),
  );

  const archivo = {
    token,
    nombre: "arbol desde la API.png",
    mimeType: "image/png",
    contenido: ICONO_ARBOL_BASE64,
  };
  const subido = pedir("POST", "archivos", {}, archivo);
  mostrarRespuesta_("POST /archivos", subido);
  mostrarRespuesta_(
    "POST /archivos (tipo no permitido)",
    pedir(
      "POST",
      "archivos",
      {},
      { ...archivo, mimeType: "application/x-msdownload" },
    ),
  );
  if (subido.ok) {
    // Limpieza: mandamos a la papelera el archivo de prueba.
    DriveApp.getFileById(subido.data.id).setTrashed(true);
  }
}

/**
 * DEMO: prueba la API SIN publicarla, llamando a doGet/doPost directo.
 */
function demo_simularPedidos() {
  recorridoDePrueba_((metodo, ruta, parametros = {}, cuerpo = undefined) => {
    const e = eventoSimulado_(ruta, parametros, cuerpo);
    const salida = metodo === "GET" ? doGet(e) : doPost(e);
    // getContent() devuelve el texto de la respuesta (el JSON).
    return JSON.parse(salida.getContent());
  });
}

/**
 * DEMO: prueba la API PUBLICADA con pedidos HTTP reales.
 * Requiere la Propiedad del script WEBAPP_URL (la URL que termina en /exec).
 */
function demo_probarApiPublicada() {
  const base = getConfig_(CONFIG_KEYS.WEBAPP_URL).replace(/\/+$/, "");
  recorridoDePrueba_((metodo, ruta, parametros = {}, cuerpo = undefined) => {
    const url = construirUrl_(`${base}/${ruta}`, parametros);
    const opciones = { method: metodo.toLowerCase() };
    if (metodo === "POST") {
      // Todo POST lleva cuerpo (aunque sea {}): algunos servidores rechazan
      // un POST sin cuerpo.
      opciones.contentType = "text/plain";
      opciones.payload = JSON.stringify(cuerpo ?? {});
    }
    const respuesta = pedirJson_(url, opciones);
    if (typeof respuesta.body !== "object" || respuesta.body === null) {
      // Si Google devolvió HTML (por ejemplo, una página de "acceso
      // denegado" o de error), lo mostramos para entender qué pasó.
      const texto = String(respuesta.body).slice(0, 200);
      return {
        ok: false,
        status: respuesta.status,
        error: `Respuesta no JSON: ${texto}`,
      };
    }
    return respuesta.body;
  });
}
