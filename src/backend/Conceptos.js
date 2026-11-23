/**
 * ============================================================================
 *  BACKEND 1: APPS SCRIPT COMO API (WEB APP)
 * ============================================================================
 *
 *  Un proyecto de Apps Script se puede PUBLICAR como "aplicación web" (web
 *  app). Google le da una URL pública, y cada vez que alguien le hace un
 *  pedido HTTP, Google ejecuta una función del proyecto:
 *      GET  -> doGet(e)
 *      POST -> doPost(e)
 *  Lo que devuelva esa función es la respuesta. Con esto, una planilla se
 *  convierte en una mini "base de datos con API": un formulario web, una
 *  app o un sistema externo pueden leer y escribir datos sin un servidor
 *  propio.
 *
 *  EL OBJETO "e" (lo que llega en cada pedido)
 *  Para https://script.google.com/macros/s/<ID>/exec/clientes/C00001?ciudad=Salta
 *    e.pathInfo     -> "clientes/C00001"  (lo que va después de /exec/;
 *                      solo llega si quien llama inició sesión en Google,
 *                      ver Router.js)
 *    e.queryString  -> "ciudad=Salta"
 *    e.parameter    -> { ciudad: "Salta" }        (un valor por parámetro)
 *    e.parameters   -> { ciudad: ["Salta"] }      (todos, si se repiten)
 *    e.postData     -> solo en POST con cuerpo:
 *        .contents  -> el cuerpo como texto
 *        .type      -> el tipo de contenido ("application/json"...)
 *        .length    -> el tamaño en bytes
 *  Si el cuerpo es un formulario (x-www-form-urlencoded), sus campos
 *  TAMBIÉN aparecen en e.parameter, mezclados con los de la URL.
 *
 *  LÍMITES (lo que lo diferencia de un backend "de verdad")
 *  | Límite                                   | Consecuencia / solución                  |
 *  |------------------------------------------|------------------------------------------|
 *  | Solo GET y POST                          | PUT/PATCH/DELETE se simulan con un POST  |
 *  |                                          | y un parámetro _method=DELETE            |
 *  | e NO trae los headers del pedido         | No hay "Authorization: Bearer": el token |
 *  |                                          | va en la URL o en el cuerpo              |
 *  | No se puede elegir el código de          | Lo que devuelve tu código sale siempre   |
 *  | respuesta (status) ni headers            | con 200: el resultado real va DENTRO del |
 *  |                                          | JSON: { ok, status, ... }                |
 *  | No responde el "preflight" CORS          | Desde un navegador solo se pueden hacer  |
 *  | (pedido OPTIONS)                         | pedidos "simples": sin headers propios y |
 *  |                                          | con cuerpo text/plain o de formulario.   |
 *  |                                          | Mandar JSON con Content-Type text/plain. |
 *  | La respuesta llega por una redirección   | El cliente tiene que seguir redirects    |
 *  | (302 a script.googleusercontent.com)     | (curl -L; fetch y UrlFetchApp ya lo hacen)|
 *  | Cuerpo de hasta ~50 MB (aproximado)      | Archivos grandes: de a uno por pedido    |
 *  | 6 min por ejecución; ~30 ejecuciones     | Con "Ejecutar como: Yo", TODOS los       |
 *  | simultáneas por usuario                  | pedidos corren como vos: esas ~30 son el |
 *  |                                          | total de todos los visitantes juntos     |
 *  | 1-3 s de demora al "despertar" (aprox.)  | No sirve para respuestas instantáneas    |
 *
 *  Sobre el "siempre 200": vale para las respuestas que arma TU código. Si
 *  la ejecución falla antes o por fuera de tu código (pasó los 6 minutos,
 *  se agotó una cuota, la implementación no existe o falta autorizarla),
 *  Google devuelve una página HTML de error, con otro código. Un cliente
 *  bien hecho chequea que la respuesta sea JSON antes de leerla.
 *
 *  ¿Por qué funcionan los pedidos desde otra página web? Porque, en la
 *  práctica, las respuestas de ContentService llegan con el header
 *  "Access-Control-Allow-Origin: *", que le dice al navegador que cualquier
 *  página puede leerlas. Lo que no funciona es el preflight (ver la tabla).
 *
 *  PUBLICAR (DEPLOY)
 *  En el editor: Implementar > Nueva implementación > tipo "Aplicación web".
 *    - "Ejecutar como": Yo (USER_DEPLOYING) -> el código corre con TUS
 *      permisos, aunque lo llame un anónimo. Por eso hay que proteger con
 *      token todo lo que escribe datos.
 *      O "Usuario que accede" (USER_ACCESSING) -> cada uno con su cuenta
 *      (tiene que iniciar sesión).
 *    - "Quién tiene acceso": Cualquier persona (ANYONE_ANONYMOUS, sin
 *      iniciar sesión), Cualquier persona con cuenta de Google, o Solo yo.
 *  Esta guía usa "Yo" + "Cualquier persona", que es lo que permite llamar a
 *  la API desde una página web o un sistema externo (ver appsscript.json).
 *
 *  OTRAS TRAMPAS DE LA URL (comprobadas probando):
 *    - .../exec/algo (con path) pide iniciar sesión a los anónimos: usar
 *      .../exec?ruta=algo (ver Router.js).
 *    - .../exec/ (con la barra final) responde 404: usar .../exec, sin barra.
 *
 *  ¿Y la planilla? Dentro de doGet/doPost, getActiveSpreadsheet() sigue
 *  devolviendo la planilla que contiene al código (comprobado), así que la
 *  API lee y escribe la hoja Clientes sin necesitar su ID.
 *
 *  DOS URLs:
 *    .../exec -> la versión PUBLICADA. Para que refleje cambios del código
 *               hay que publicar una versión nueva: Implementar > Gestionar
 *               implementaciones > editar (lápiz) > Versión: "Nueva versión".
 *               Así la URL no cambia.
 *    .../dev  -> el código ACTUAL (sin publicar). Solo la pueden usar los
 *               editores, con sesión iniciada. Sirve para probar.
 * ============================================================================
 */
