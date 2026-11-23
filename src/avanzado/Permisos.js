/**
 * ============================================================================
 *  AVANZADO 2: LOS PERMISOS (SCOPES) DEL PROYECTO
 * ============================================================================
 *
 *  Cada cosa que el código hace con tu cuenta necesita un PERMISO ("scope"):
 *  leer planillas, usar Drive, mandar mails, conectarse a internet...
 *
 *  Por defecto, Apps Script LEE TODO EL CÓDIGO del proyecto y pide los
 *  permisos de todos los servicios que encuentra, aunque una función nunca
 *  se ejecute (por eso, con docs-mail/Gmail.js en el proyecto, se pide
 *  acceso a Gmail). Los permisos que se PIDEN son del proyecto entero, no
 *  de cada función. Ojo: en la pantalla de autorización, la persona puede
 *  destildar algunos permisos ("consentimiento granular"). Si algo falla
 *  con "no tenés permiso" aunque el proyecto lo pida, puede ser eso:
 *  volvé a autorizar y dejá todo tildado.
 *
 *  Se pueden FIJAR A MANO en appsscript.json:
 *    "oauthScopes": [
 *      "https://www.googleapis.com/auth/spreadsheets.currentonly",
 *      "https://www.googleapis.com/auth/script.send_mail"
 *    ]
 *  Ventaja: pedís solo lo justo (por ejemplo, "solo ESTA planilla" en lugar
 *  de "todas tus planillas"), y la pantalla de autorización asusta menos.
 *  Riesgo: si falta uno, lo que lo necesite falla con "no tenés permiso".
 *  Cada vez que agregues un servicio, hay que sumar su permiso a la lista.
 *
 *  ¿Cuáles usa el proyecto hoy? Dos formas de verlo:
 *    - En el editor: "Descripción general" (el ícono "i", arriba a la
 *      izquierda) > "Permisos de OAuth del proyecto".
 *    - Con demo_verPermisosDelToken, que le pregunta a Google qué permisos
 *      tiene el token con el que corre el código.
 *
 *  Lo que se vio al correrlo en esta guía (13 permisos), dos lecciones:
 *    - Aparece https://mail.google.com/ (acceso COMPLETO a Gmail), solo
 *      porque docs-mail/Gmail.js existe en el proyecto.
 *    - Aparece "presentations" (Google Slides), aunque la guía NUNCA usa
 *      Slides: la detección automática a veces pide DE MÁS. Otro motivo
 *      para fijar los permisos a mano en un proyecto real.
 *
 *  Para ver o quitar los permisos que le diste a un proyecto:
 *  https://myaccount.google.com/permissions
 * ============================================================================
 */

/**
 * DEMO: lista los permisos con los que está corriendo el código, según
 * Google (el endpoint "tokeninfo" describe un token de acceso).
 */
function demo_verPermisosDelToken() {
  const respuesta = pedirJson_(
    construirUrl_("https://oauth2.googleapis.com/tokeninfo", {
      access_token: ScriptApp.getOAuthToken(),
    }),
  );
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo consultar el token (código ${respuesta.status})`,
    );
  }
  // scope: todos los permisos, separados por espacios.
  const permisos = String(respuesta.body.scope).split(" ").sort();
  console.log(
    `El proyecto corre con ${permisos.length} permisos:\n${permisos.join("\n")}`,
  );
  console.log(
    `El token vence en ${Math.round(Number(respuesta.body.expires_in) / 60)} minutos (Google lo renueva solo).`,
  );
}
