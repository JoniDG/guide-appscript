/**
 * ============================================================================
 *  SETUP: PREPARA TODO LO QUE LA GUÍA NECESITA PARA FUNCIONAR
 * ============================================================================
 *
 *  ¿Cuándo se usa?
 *  - La primera vez, justo después de subir el código con `clasp push`.
 *  - Cada vez que se agregue un tema nuevo a la guía (porque un tema nuevo
 *    puede necesitar hojas nuevas).
 *
 *  ¿Cómo se ejecuta?
 *  1. Abrí la Spreadsheet de la guía > Extensiones > Apps Script.
 *  2. En el editor, abrí el archivo config/Setup.gs.
 *  3. Arriba, en el desplegable de funciones, elegí "setup".
 *  4. Tocá ▶ Ejecutar.
 *  5. La PRIMERA vez Google te pide autorización: "Revisar permisos" >
 *     elegí tu cuenta > si aparece "Google no verificó esta app", tocá
 *     "Configuración avanzada" > "Ir a <nombre del proyecto> (no seguro)" >
 *     "Permitir". Es normal: la app la escribiste vos y no pasó por la
 *     verificación de Google (eso solo hace falta para apps públicas).
 *
 *  ¿Es peligroso ejecutarlo varias veces?
 *  No. setup() es "idempotente": solo crea lo que falta. Si una hoja ya
 *  existe, no borra sus datos. Si la carpeta de Drive ya existe, la
 *  reutiliza. Las únicas cosas que reescribe en cada corrida son:
 *    - La hoja "Inicio" (el índice) y la hoja "Funciones personalizadas"
 *      (los ejemplos), que son generadas por la guía.
 *    - La zona horaria de la planilla, que iguala a la del proyecto.
 * ============================================================================
 */

/**
 * Nombre de la carpeta de Drive que crea la guía para sus archivos de prueba.
 */
const GUIDE_FOLDER_NAME = "Guía Apps Script - Archivos de prueba";

/**
 * Nombre de la hoja con el índice de la guía. Está en una constante porque
 * se usa en dos lugares (GUIDE_SHEETS y setup): si alguien la renombra,
 * se cambia en un solo lugar y no se rompe nada.
 *
 * Tiene que estar declarada ANTES de GUIDE_SHEETS, porque GUIDE_SHEETS la
 * usa en el momento en que se carga el archivo.
 */
const INDEX_SHEET_NAME = "Inicio";

/**
 * Nombres de las hojas que usa cada tema. Están acá (y no en la carpeta de
 * cada tema) porque GUIDE_SHEETS los usa al cargarse el archivo, y Apps
 * Script NO garantiza en qué orden carga los archivos: una constante de
 * otro archivo podría todavía no existir en ese momento.
 */
// Tema Spreadsheet
const SHEET_CLIENTES = "Clientes";
const SHEET_PRUEBAS = "Pruebas";
const SHEET_FORMATO = "Formato";
const SHEET_FUNCIONES = "Funciones personalizadas";
// Tema HTML / UI
const SHEET_PANEL = "Panel";
const SHEET_REPORTE = "Reporte";
const CLIENTES_HEADERS = [
  "id",
  "nombre",
  "email",
  "ciudad",
  "fecha_alta",
  "monto",
  "activo",
];

/**
 * Las hojas (pestañas) que necesita la guía dentro de la Spreadsheet.
 *
 * Cada tema de la guía agrega acá las hojas que usa. Cada elemento tiene:
 *   - name:    el nombre de la pestaña.
 *   - headers: los títulos de la primera fila (los "encabezados").
 *              Si la hoja no necesita encabezados, se deja como [].
 */
const GUIDE_SHEETS = [
  { name: INDEX_SHEET_NAME, headers: [] },
  { name: SHEET_CLIENTES, headers: CLIENTES_HEADERS },
  { name: SHEET_PRUEBAS, headers: [] },
  { name: SHEET_FORMATO, headers: [] },
  { name: SHEET_FUNCIONES, headers: [] },
];

/**
 * Los temas de la guía. Se usan para escribir el índice en la hoja "Inicio".
 * Mantener sincronizado con la tabla de temas del README.md.
 */
const GUIDE_TOPICS = [
  {
    numero: 1,
    tema: "Fundamentos",
    carpeta: "src/fundamentos y src/utils",
    estado: "Listo",
  },
  {
    numero: 2,
    tema: "Spreadsheet",
    carpeta: "src/spreadsheet",
    estado: "Listo",
  },
  {
    numero: 3,
    tema: "Drive y archivos",
    carpeta: "src/drive",
    estado: "Listo",
  },
  {
    numero: 4,
    tema: "Requests (HTTP saliente)",
    carpeta: "src/requests",
    estado: "Listo",
  },
  {
    numero: 5,
    tema: "Backend / Endpoints",
    carpeta: "src/backend",
    estado: "Listo",
  },
  { numero: 6, tema: "HTML / UI", carpeta: "src/html", estado: "Listo" },
  {
    numero: 7,
    tema: "Triggers y automatización",
    carpeta: "src/triggers",
    estado: "Pendiente",
  },
  {
    numero: 8,
    tema: "Estado, concurrencia y jobs largos",
    carpeta: "src/estado",
    estado: "Pendiente",
  },
  {
    numero: 9,
    tema: "Docs y Mail",
    carpeta: "src/docs-mail",
    estado: "Pendiente",
  },
  {
    numero: 10,
    tema: "Avanzado",
    carpeta: "src/avanzado",
    estado: "Pendiente",
  },
];

/**
 * Prepara la Spreadsheet y Drive para usar la guía.
 * Es la función que se ejecuta a mano desde el editor (ver arriba).
 */
function setup() {
  const folder = ensureGuideFolder_();
  console.log(
    `Carpeta de Drive lista: ${folder.getName()} -> ${folder.getUrl()}`,
  );

  const spreadsheet = getGuideSpreadsheet_();
  for (const sheetDef of GUIDE_SHEETS) {
    const created = ensureSheet_(spreadsheet, sheetDef.name, sheetDef.headers);
    console.log(
      `${created ? "Creada" : "Ya existía"}: hoja "${sheetDef.name}"`,
    );
  }

  // Igualamos la zona horaria de la planilla con la del proyecto, para que
  // las fechas que escribe el código se vean igual en las celdas (ver
  // spreadsheet/FechasEnPlanillas.js).
  spreadsheet.setSpreadsheetTimeZone(Session.getScriptTimeZone());
  console.log(`Zona horaria de la planilla: ${spreadsheet.getSpreadsheetTimeZone()}`);

  // Token de la API (tema Backend): si no existe, generamos uno al azar.
  // No lo imprimimos en el log: se ve en Configuración del proyecto >
  // Propiedades del script.
  if (PropertiesService.getScriptProperties().getProperty(CONFIG_KEYS.API_TOKEN) === null) {
    setConfig_(CONFIG_KEYS.API_TOKEN, Utilities.getUuid());
    console.log("Creado el token de la API (API_TOKEN en las Propiedades del script).");
  }

  // Datos y ejemplos del tema Spreadsheet.
  const cargados = poblarClientesDeEjemplo_(
    spreadsheet.getSheetByName(SHEET_CLIENTES),
  );
  console.log(
    cargados
      ? "Cargados los clientes de ejemplo."
      : "La hoja Clientes ya tenía datos.",
  );
  escribirEjemplosDeFuncionesPersonalizadas_(
    spreadsheet.getSheetByName(SHEET_FUNCIONES),
  );

  // Tema HTML / UI: la hoja Panel con los botones (se rearma en cada setup).
  const botones = crearPanel_();
  console.log(`Hoja "${SHEET_PANEL}" creada con ${botones} botones.`);

  writeIndexSheet_(spreadsheet.getSheetByName(INDEX_SHEET_NAME));
  console.log(
    `Setup terminado. Mirá la hoja '${INDEX_SHEET_NAME}' de la Spreadsheet.`,
  );
}

/**
 * Se asegura de que exista la carpeta de Drive de la guía y la devuelve.
 *
 * Guardamos el ID de la carpeta en las Propiedades del script (y no su
 * nombre) porque en Drive puede haber muchas carpetas con el mismo nombre,
 * pero el ID es único: siempre apunta a UNA carpeta.
 *
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function ensureGuideFolder_() {
  const savedId = PropertiesService.getScriptProperties().getProperty(
    CONFIG_KEYS.GUIDE_FOLDER_ID,
  );

  if (savedId) {
    // try/catch: "intentá esto, y si falla, hacé esto otro".
    // getFolderById tira un error si la carpeta fue borrada definitivamente
    // o si perdimos el acceso. En ese caso, seguimos y creamos una nueva.
    try {
      const folder = DriveApp.getFolderById(savedId);
      // Una carpeta en la papelera todavía "existe", pero no la queremos usar.
      if (!folder.isTrashed()) {
        return folder;
      }
    } catch (error) {
      // Mostramos el motivo real (error.message): puede ser que la carpeta
      // ya no exista, pero también que no tengamos permiso o que Drive haya
      // fallado un momento. Sin el motivo, no habría forma de saberlo.
      console.log(
        `No se pudo abrir la carpeta guardada (${savedId}): ${error.message}. Se crea una nueva.`,
      );
    }
  }

  // createFolder crea la carpeta en la raíz de "Mi unidad" del usuario
  // que ejecuta el script.
  const folder = DriveApp.createFolder(GUIDE_FOLDER_NAME);
  setConfig_(CONFIG_KEYS.GUIDE_FOLDER_ID, folder.getId());
  return folder;
}

/**
 * Se asegura de que exista una hoja con ese nombre. Si no existe, la crea
 * y le escribe los encabezados.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet
 * @param {string} name       Nombre de la hoja (pestaña).
 * @param {string[]} headers  Encabezados para la fila 1.
 * @returns {boolean}         true si la creó, false si ya existía.
 */
function ensureSheet_(spreadsheet, name, headers) {
  // getSheetByName devuelve null si no hay ninguna hoja con ese nombre.
  if (spreadsheet.getSheetByName(name) !== null) {
    return false;
  }

  // insertSheet crea una pestaña nueva al final.
  const sheet = spreadsheet.insertSheet(name);

  if (headers.length > 0) {
    // getRange(fila, columna, cantidadDeFilas, cantidadDeColumnas)
    // Las filas y columnas en Sheets empiezan en 1 (no en 0 como en JS).
    // setValues recibe una "matriz": un array de filas, donde cada fila es
    // un array de celdas. Por eso headers va adentro de otros corchetes.
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold");
    // Congela la fila 1: al bajar con el scroll, los títulos quedan visibles.
    sheet.setFrozenRows(1);
  }
  return true;
}

/**
 * Escribe el índice de la guía en la hoja "Inicio".
 * Se reescribe completo cada vez que se ejecuta setup(), así siempre está
 * actualizado con GUIDE_TOPICS.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function writeIndexSheet_(sheet) {
  sheet.clear();

  sheet
    .getRange("A1")
    .setValue("Guía de Google Apps Script")
    .setFontSize(18)
    .setFontWeight("bold");
  sheet
    .getRange("A2")
    .setValue(
      "Cada tema tiene su carpeta en el editor de Apps Script (Extensiones > Apps Script). " +
        "Las funciones que empiezan con demo_ se pueden ejecutar con el botón ▶.",
    );

  const headers = ["#", "Tema", "Carpeta", "Estado"];
  // map: transforma cada tema (un objeto) en una fila (un array de valores).
  const rows = GUIDE_TOPICS.map((t) => [t.numero, t.tema, t.carpeta, t.estado]);

  // Escribimos encabezados + filas de una sola vez. Escribir todo junto con
  // un solo setValues es MUCHÍSIMO más rápido que escribir celda por celda
  // (cada llamada a la Spreadsheet tarda; lo ideal es hacer pocas llamadas).
  const table = [headers, ...rows];
  sheet.getRange(4, 1, table.length, headers.length).setValues(table);
  sheet.getRange(4, 1, 1, headers.length).setFontWeight("bold");
  // La columna A tiene textos largos (título y descripción) que harían que
  // el ajuste automático la deje enorme: le damos un ancho fijo y ajustamos
  // automáticamente solo el resto.
  sheet.setColumnWidth(1, 40);
  sheet.autoResizeColumns(2, headers.length - 1);
}
