/**
 * ============================================================================
 *  CONFIGURACIÓN DE LA GUÍA
 * ============================================================================
 *
 *  ¿Qué hay en este archivo?
 *  Funciones para obtener "cosas" que el resto de la guía necesita:
 *    - La Spreadsheet (el archivo de Google Sheets) donde vive este código.
 *    - La carpeta de Google Drive donde la guía guarda archivos de prueba.
 *    - Valores de configuración y secretos (API keys, tokens, IDs).
 *
 *  ¿Por qué no escribimos los IDs o las API keys directamente en el código?
 *  Porque el código se sube a GitHub (es público). Si escribís una API key
 *  adentro de un archivo .js, cualquiera que lo lea puede usarla.
 *  En lugar de eso, los guardamos en las "Propiedades del script"
 *  (Script Properties): una especie de cajita de valores que vive en Google,
 *  pegada al proyecto, y que NO se sube a GitHub.
 *
 *  ¿Dónde se ven las Propiedades del script?
 *  En el editor de Apps Script: ⚙️ Configuración del proyecto (Project
 *  Settings) > abajo de todo, "Propiedades del script".
 *  Ahí podés agregar valores a mano (por ejemplo WHATSAPP_TOKEN) y el
 *  código los lee con getConfig_("WHATSAPP_TOKEN").
 *
 *  Convención de nombres que usamos en toda la guía:
 *    - Las funciones que terminan con guion bajo (ej: getConfig_) son
 *      "privadas": Apps Script NO las muestra en el menú para ejecutar
 *      del editor, y tampoco se pueden llamar desde una página web.
 *      Son funciones de ayuda que usan otras funciones.
 *    - Las funciones que empiezan con demo_ son ejemplos listos para
 *      ejecutar desde el editor con el botón ▶ "Ejecutar".
 * ============================================================================
 */

/**
 * Nombres de las claves que guardamos en las Propiedades del script.
 * Tenerlas en un solo lugar evita errores de tipeo: el editor te
 * autocompleta CONFIG_KEYS.GUIDE_FOLDER_ID, y en VS Code (con el
 * jsconfig.json de este repo) un nombre mal escrito queda marcado en rojo.
 * Ojo: el editor online de Apps Script NO marca ese error; ahí un nombre
 * mal escrito simplemente da undefined.
 */
const CONFIG_KEYS = {
  // ID de la carpeta de Drive donde la guía guarda archivos de prueba.
  // La crea automáticamente la función setup() (ver Setup.js).
  GUIDE_FOLDER_ID: "GUIDE_FOLDER_ID",
};

/**
 * Lee un valor de las Propiedades del script.
 *
 * @param {string} key  El nombre de la propiedad (ej: "GUIDE_FOLDER_ID").
 * @returns {string}    El valor guardado.
 * @throws {Error}      Si la propiedad no existe, con un mensaje que explica
 *                      cómo solucionarlo (en vez de devolver null y que el
 *                      error aparezca más tarde en un lugar difícil de
 *                      entender).
 */
function getConfig_(key) {
  // PropertiesService es el servicio de Google para guardar pares
  // "clave = valor". getScriptProperties() devuelve las propiedades
  // del PROYECTO (compartidas por todos los que usen este script).
  const value = PropertiesService.getScriptProperties().getProperty(key);

  if (value === null) {
    throw new Error(
      `Falta la propiedad del script "${key}". ` +
        `Si es una propiedad que crea la guía, ejecutá setup(); si no, ` +
        `agregala a mano en ` +
        `Configuración del proyecto > Propiedades del script.`,
    );
  }
  return value;
}

/**
 * Guarda (o reemplaza) un valor en las Propiedades del script.
 *
 * @param {string} key    El nombre de la propiedad.
 * @param {string} value  El valor a guardar. Siempre se guarda como texto.
 */
function setConfig_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

/**
 * Devuelve la Spreadsheet de la guía.
 *
 * Este proyecto está "ligado" (container-bound) a una Spreadsheet: se abre
 * desde Sheets > Extensiones > Apps Script. Por eso no necesitamos guardar
 * el ID de la Spreadsheet en ningún lado: getActiveSpreadsheet() devuelve
 * el archivo que "contiene" a este código. Funciona tanto si ejecutás desde
 * el editor como desde un activador (trigger). El caso del web app (cuando
 * el código responde a pedidos desde internet) lo vemos en el tema Backend.
 *
 * Si quisieras abrir OTRA Spreadsheet (no la que contiene al código),
 * usarías SpreadsheetApp.openById("ID") o SpreadsheetApp.openByUrl("URL").
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getGuideSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Devuelve la carpeta de Drive de la guía (la crea setup()).
 *
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getGuideFolder_() {
  return DriveApp.getFolderById(getConfig_(CONFIG_KEYS.GUIDE_FOLDER_ID));
}

/**
 * DEMO: muestra en el registro de ejecución (abajo del editor) todas las
 * Propiedades del script que hay guardadas.
 *
 * Ojo: si guardaste secretos (API keys), este demo los imprime. El registro
 * solo lo ven los editores del proyecto, pero no lo compartas en capturas.
 */
function demo_verConfiguracion() {
  const todas = PropertiesService.getScriptProperties().getProperties();
  console.log(
    "Propiedades del script guardadas:",
    JSON.stringify(todas, null, 2),
  );
}
