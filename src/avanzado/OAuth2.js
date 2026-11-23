/**
 * ============================================================================
 *  AVANZADO 4: OAUTH2 CON SERVICIOS EXTERNOS (OPCIONAL)
 * ============================================================================
 *
 *  AVISO: es el ÚNICO ejemplo de la guía que NO se probó en una corrida
 *  real (requiere crear una app OAuth en GitHub). El código sigue el
 *  ejemplo oficial de la biblioteca, pero tomalo como punto de partida.
 *
 *  OAuth2 es la forma estándar de que un usuario le dé permiso a TU app para
 *  usar su cuenta de OTRO servicio (GitHub, Dropbox, Spotify, Mercado
 *  Libre...), sin darte su contraseña. El usuario ve la pantalla del otro
 *  servicio, acepta, y tu app recibe un TOKEN para llamar a la API en su
 *  nombre (como el Bearer del tema Requests).
 *
 *  Implementarlo a mano es largo (redirecciones, códigos, renovar tokens).
 *  Google publica una biblioteca oficial que lo resuelve: "OAuth2 for Apps
 *  Script" (https://github.com/googleworkspace/apps-script-oauth2).
 *
 *  Este ejemplo conecta con GitHub. Es OPCIONAL y requiere:
 *    1. Agregar la biblioteca al proyecto: en el editor, Bibliotecas + >
 *       ID 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF >
 *       Buscar > la última versión > Identificador: OAuth2 > Agregar.
 *       (No la ponemos por código en appsscript.json: si la versión no
 *       existiera, todo el proyecto dejaría de funcionar.)
 *    2. Crear una "OAuth App" en GitHub: Settings > Developer settings >
 *       OAuth Apps > New. Como "Authorization callback URL" va:
 *         https://script.google.com/macros/d/<ID_DEL_PROYECTO>/usercallback
 *       (el ID está en Configuración del proyecto > IDs; demo_urlDeCallback
 *       te la arma).
 *    3. Guardar en las Propiedades del script GITHUB_CLIENT_ID y
 *       GITHUB_CLIENT_SECRET (los da GitHub al crear la app).
 *    4. Ejecutar demo_conectarGitHub, abrir el link que muestra, aceptar,
 *       y después demo_llamarAGitHub.
 * ============================================================================
 */

/**
 * Arma el "servicio" OAuth2 de GitHub con la biblioteca.
 * @returns {Object}
 */
function servicioGitHub_() {
  // @ts-ignore: OAuth2 existe solo si se agregó la biblioteca (VS Code no lo sabe).
  if (typeof OAuth2 === "undefined") {
    throw new Error(
      "Falta agregar la biblioteca OAuth2 al proyecto (ver avanzado/OAuth2.js, paso 1).",
    );
  }
  return (
    OAuth2.createService("github")
      .setAuthorizationBaseUrl("https://github.com/login/oauth/authorize")
      .setTokenUrl("https://github.com/login/oauth/access_token")
      .setClientId(getConfig_("GITHUB_CLIENT_ID"))
      .setClientSecret(getConfig_("GITHUB_CLIENT_SECRET"))
      // La función que GitHub "llama" al volver de la pantalla de permiso.
      .setCallbackFunction("alVolverDeGitHub")
      // Dónde guarda el token: en las propiedades de CADA usuario.
      .setPropertyStore(PropertiesService.getUserProperties())
      // Qué permisos le pedimos a GitHub: solo leer el perfil.
      .setScope("read:user")
  );
}

/** DEMO: muestra la URL de callback que hay que configurar en GitHub. */
function demo_urlDeCallback() {
  console.log(
    `https://script.google.com/macros/d/${ScriptApp.getScriptId()}/usercallback`,
  );
}

/**
 * DEMO: si todavía no hay permiso, muestra el link para darlo.
 */
function demo_conectarGitHub() {
  const servicio = servicioGitHub_();
  if (servicio.hasAccess()) {
    console.log("Ya estás conectado a GitHub. Probá demo_llamarAGitHub.");
    return;
  }
  console.log(
    `Abrí este link, aceptá, y volvé:\n${servicio.getAuthorizationUrl()}`,
  );
}

/**
 * GitHub vuelve acá después de que el usuario acepta (o rechaza). Tiene que
 * ser pública: la llama Google con el resultado.
 *
 * @param {Object} pedido
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function alVolverDeGitHub(pedido) {
  const autorizado = servicioGitHub_().handleCallback(pedido);
  return HtmlService.createHtmlOutput(
    autorizado
      ? "Listo: conectado a GitHub. Ya podés cerrar esta pestaña."
      : "No se dio el permiso.",
  );
}

/** DEMO: llama a la API de GitHub con el token (quién sos). */
function demo_llamarAGitHub() {
  const servicio = servicioGitHub_();
  if (!servicio.hasAccess()) {
    throw new Error("Primero ejecutá demo_conectarGitHub y aceptá el permiso.");
  }
  const respuesta = pedirJson_("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${servicio.getAccessToken()}`,
      Accept: "application/vnd.github+json",
    },
  });
  console.log(
    `Conectado como: ${respuesta.body.login} (${respuesta.body.public_repos} repos públicos)`,
  );
}

/** DEMO: olvida el token (desconecta). */
function demo_desconectarGitHub() {
  servicioGitHub_().reset();
  console.log("Desconectado de GitHub.");
}
