/**
 * ============================================================================
 *  HTML / UI 1: CONCEPTOS (VENTANAS, FORMULARIOS Y PÁGINAS CON HTML)
 * ============================================================================
 *
 *  Con HtmlService podés mostrar tus propias pantallas, hechas con HTML, CSS
 *  y JavaScript (las mismas tecnologías de cualquier página web):
 *    - Dentro de la planilla: un MODAL (ventana que bloquea la planilla
 *      hasta cerrarse), un diálogo NO modal (deja seguir trabajando) o una
 *      BARRA LATERAL (sidebar, a la derecha).
 *    - Como PÁGINA WEB, servida por doGet (ver PaginaWeb.js).
 *
 *  DOS MUNDOS QUE HAY QUE DISTINGUIR
 *    - El SERVIDOR: tu código .gs, que corre en Google. Puede leer y
 *      escribir la planilla, Drive, etc.
 *    - El NAVEGADOR: el HTML y su <script>, que corre en la compu de quien
 *      mira la ventana. NO puede tocar la planilla directamente.
 *  Se comunican con google.script.run: desde el navegador se "llama" a una
 *  función del servidor, y la respuesta vuelve después (ver vistas/comun.html).
 *
 *  REGLAS DE google.script.run
 *    - Solo puede llamar funciones "públicas": las que NO terminan en "_".
 *      Por eso las funciones que usan las ventanas se llaman ui... (ver
 *      Servidor.js) y no terminan en guion bajo.
 *    - Es ASÍNCRONO: la llamada sale, y el resultado llega más tarde a una
 *      función "de éxito" o "de error". Nunca devuelve el valor directamente.
 *    - Lo que viaja tiene que ser "simple": textos, números, booleanos,
 *      listas y objetos de esos tipos. Un Date NO puede viajar (la llamada
 *      falla o llega null): hay que convertir las fechas a texto antes.
 *    - Si la función del servidor tira un error, llega a la función "de
 *      error" del navegador, con su mensaje.
 *
 *  ARCHIVOS .html Y TEMPLATES
 *    HtmlService.createHtmlOutputFromFile("html/vistas/X") -> HTML tal cual.
 *    HtmlService.createTemplateFromFile("html/vistas/X")   -> un TEMPLATE:
 *    un HTML con "scriptlets" que se ejecutan en el SERVIDOR antes de
 *    mostrarlo, para meter datos:
 *        <?= valor ?>   escribe el valor, "escapado" (seguro: si el valor
 *                       tiene <script>, se muestra como texto y no se ejecuta)
 *        <?!= valor ?>  escribe el valor SIN escapar. Solo para HTML que
 *                       generamos nosotros (como incluir_). Nunca con datos
 *                       que escribió un usuario: sería un agujero de seguridad
 *                       (XSS: alguien podría inyectar código en tu ventana).
 *        <? código ?>   ejecuta código sin escribir nada (ej: un for).
 *    A un template se le pasan datos como propiedades (template.ciudades =
 *    [...]) y se convierte en HTML con template.evaluate().
 *
 *  EL PATRÓN "INCLUDE"
 *    Para no repetir el CSS y el JavaScript común en cada ventana, van en
 *    archivos aparte (vistas/estilos.html, vistas/comun.html) y cada ventana
 *    los incluye con <?!= incluir_("html/vistas/estilos") ?>.
 *
 *  CSS: EL HTML VIVE EN UNA "CAJA AISLADA"
 *    Cada ventana corre dentro de un iframe (una página dentro de otra). Tu
 *    CSS solo afecta a tu ventana, nunca a la planilla. Opciones:
 *      - CSS propio (vistas/estilos.html): control total. Lo que usa la guía.
 *      - El CSS oficial de Google para complementos, para que la ventana se
 *        vea "nativa" (ver demo_dialogoConCssDeGoogle en Dialogos.js).
 *      - Un framework por CDN (Bootstrap, etc.): funciona, pero suma tiempo
 *        de carga cada vez que se abre la ventana.
 *    El tamaño de un modal se fija desde el código (setWidth / setHeight) y
 *    el usuario no lo puede cambiar. La sidebar tiene ancho fijo (~300 px).
 * ============================================================================
 */

/**
 * Devuelve el contenido de un archivo .html para pegarlo dentro de otro
 * (el patrón "include"). Se usa desde los templates:
 *     <?!= incluir_("html/vistas/estilos") ?>
 *
 * Puede terminar en "_" porque NO la llama el navegador: los scriptlets de
 * un template se ejecutan en el servidor.
 *
 * @param {string} nombreArchivo  Ej: "html/vistas/estilos".
 * @returns {string}
 */
function incluir_(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

/**
 * Arma una ventana a partir de un template, pasándole datos.
 *
 * @param {string} vista   Nombre del archivo dentro de html/vistas/.
 * @param {Object} datos   Datos que el template puede usar (cada clave pasa
 *                         a ser una variable dentro del template).
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function ventana_(vista, datos = {}) {
  const template = HtmlService.createTemplateFromFile(`html/vistas/${vista}`);
  Object.assign(template, datos);
  return template.evaluate();
}
