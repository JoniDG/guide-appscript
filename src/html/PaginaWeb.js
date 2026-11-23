/**
 * ============================================================================
 *  HTML / UI 6: UNA PÁGINA WEB SERVIDA POR APPS SCRIPT
 * ============================================================================
 *
 *  doGet también puede devolver una PÁGINA (HtmlService) en lugar de JSON
 *  (ContentService). Así el mismo proyecto sirve un formulario web, sin
 *  hosting propio y sin problemas de CORS: la página y el servidor son el
 *  mismo proyecto, y se hablan con google.script.run.
 *
 *  En esta guía, doGet (backend/Router.js) mira el parámetro "pagina":
 *    .../exec?pagina=alta   -> esta página (el formulario de alta)
 *    .../exec?ruta=...      -> la API JSON del tema Backend
 *
 *  ⚠️ SEGURIDAD: LA REGLA MÁS IMPORTANTE DE LAS PÁGINAS WEB
 *  Desde una página servida por este proyecto, google.script.run puede
 *  llamar a CUALQUIER función pública del proyecto (todas las que no
 *  terminan en "_"), no solo a las que usa la página. Alguien con un poco
 *  de conocimiento lo puede hacer desde la consola del navegador. Si el web
 *  app es público y "se ejecuta como yo", un visitante podría ejecutar, por
 *  ejemplo, demo_limpiarCarpetaDeDemos o setup() CON TUS PERMISOS.
 *
 *  Y no solo desde ESTA página: CUALQUIER página de HtmlService que
 *  devuelva el web app (incluso una de "acceso denegado" o "no existe")
 *  trae google.script.run adentro. Por eso los rechazos se devuelven como
 *  TEXTO PLANO (ContentService), que no lo trae.
 *
 *  En esta guía (que tiene muchísimas funciones públicas) la página solo
 *  se muestra a quien implementó el web app (o a los editores, por /dev). Para un formulario web
 *  público de verdad, la práctica segura es un PROYECTO APARTE, que tenga
 *  como públicas SOLO las funciones que la página necesita.
 *
 *  ¿Cómo la ve el dueño? Con la URL de prueba que termina en /dev (pide
 *  iniciar sesión, y solo la pueden usar los editores; en /dev el código
 *  corre como quien la abre, así que cualquier editor pasa el chequeo, lo
 *  cual está bien: los editores ya pueden ver y cambiar el código):
 *    https://script.google.com/macros/s/<ID>/dev?pagina=alta
 *  En Implementar > Probar implementaciones está esa URL.
 * ============================================================================
 */

/**
 * Devuelve la página pedida, solo si quien la pide es el dueño.
 *
 * @param {string} nombre  El valor del parámetro "pagina".
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function servirPagina_(nombre) {
  // getActiveUser: quien visita (vacío si es anónimo o de otro dominio).
  // getEffectiveUser: con cuyos permisos corre el código (quien implementó
  // el web app, si "se ejecuta como yo").
  const visitante = Session.getActiveUser().getEmail();
  const duenio = Session.getEffectiveUser().getEmail();

  // IMPORTANTE: los rechazos van como TEXTO PLANO (ContentService) y NO
  // como HtmlService: una página de HtmlService, aunque solo diga "acceso
  // denegado", le daría al visitante google.script.run (ver arriba).
  if (!visitante || visitante !== duenio) {
    return ContentService.createTextOutput(
      "Esta página de ejemplo solo la puede ver el dueño del proyecto " +
        "(ver html/PaginaWeb.js). Si sos el dueño, abrila con la URL de prueba (la que termina en /dev).",
    );
  }
  if (nombre !== "alta") {
    return ContentService.createTextOutput("No existe esa página.");
  }

  return (
    ventana_("AltaCliente", { ciudades: ciudadesDeClientes_(), modo: "web" })
      .setTitle("Alta de cliente")
      // Para que se vea bien en el celular (sin esto, el navegador muestra la
      // página "achicada" como si fuera de escritorio).
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
  );
}
