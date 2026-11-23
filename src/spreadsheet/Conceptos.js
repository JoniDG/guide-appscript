/**
 * ============================================================================
 *  SPREADSHEET 1: CONCEPTOS BÁSICOS Y NAVEGACIÓN
 * ============================================================================
 *
 *  Una planilla de Google Sheets tiene 3 niveles. En Apps Script cada uno es
 *  un tipo de objeto distinto:
 *
 *    Spreadsheet  -> el ARCHIVO completo (lo que ves en Drive).
 *      Sheet      -> cada HOJA o pestaña de abajo ("Hoja 1", "Clientes"...).
 *        Range    -> un RANGO: una celda o un bloque de celdas (A1, A1:C10).
 *
 *  Casi todo lo que se hace con planillas es: conseguir la Spreadsheet,
 *  después la Sheet, después el Range, y leer o escribir en ese Range.
 *
 *  ¿Cómo se consigue la Spreadsheet?
 *    SpreadsheetApp.getActiveSpreadsheet()  -> la que contiene a este código
 *                                              (script "ligado", como esta guía).
 *    SpreadsheetApp.openById("ID")          -> cualquier otra, por su ID.
 *    SpreadsheetApp.openByUrl("https://...")-> cualquier otra, por su URL.
 *  El ID es la parte larga de la URL:
 *    https://docs.google.com/spreadsheets/d/<ESTE_ES_EL_ID>/edit
 *
 *  ¿Cómo se indica un rango? Dos formas:
 *    Notación A1:            sheet.getRange("B2:D5")
 *    Números (fila, columna): sheet.getRange(2, 2, 4, 3)
 *        = desde la fila 2, columna 2 (B), 4 filas de alto, 3 columnas de ancho
 *  En Sheets las filas y columnas empiezan en 1. En las listas de
 *  JavaScript (arrays) empiezan en 0. Esta diferencia es LA fuente de
 *  errores más común: la fila 1 de la hoja es la posición 0 del array.
 * ============================================================================
 */

/**
 * DEMO: recorrer la planilla: nombre, URL, hojas y su tamaño.
 */
function demo_recorrerPlanilla() {
  const spreadsheet = getGuideSpreadsheet_();
  console.log("Archivo:", spreadsheet.getName());
  console.log("URL:", spreadsheet.getUrl());
  console.log("ID:", spreadsheet.getId());

  // getSheets devuelve todas las hojas, en el orden de las pestañas.
  for (const sheet of spreadsheet.getSheets()) {
    // getLastRow / getLastColumn: la última fila / columna con contenido.
    // Si la hoja está vacía, devuelven 0.
    console.log(
      `Hoja "${sheet.getName()}": ${sheet.getLastRow()} filas con datos, ` +
        `${sheet.getLastColumn()} columnas, oculta: ${sheet.isSheetHidden()}`,
    );
  }
}

/**
 * DEMO: crear, renombrar, ocultar, mostrar, copiar y borrar hojas.
 * Trabaja sobre una hoja temporal, así no toca nada tuyo.
 */
function demo_manejarHojas() {
  const spreadsheet = getGuideSpreadsheet_();
  const nombre = "Temporal demo";

  // Si quedó de una ejecución anterior, la borramos para empezar limpio.
  const vieja = spreadsheet.getSheetByName(nombre);
  if (vieja !== null) {
    spreadsheet.deleteSheet(vieja);
  }

  // insertSheet(nombre) la crea al final. insertSheet(nombre, 0) la
  // crearía como primera pestaña.
  const hoja = spreadsheet.insertSheet(nombre);
  hoja.getRange("A1").setValue("Hoja creada por código");
  console.log("Creada:", hoja.getName());

  hoja.setName(`${nombre} (renombrada)`);
  console.log("Renombrada:", hoja.getName());

  // Ocultar una hoja NO la protege: cualquiera con acceso de edición la
  // puede volver a mostrar. Sirve para ordenar, no para seguridad.
  hoja.hideSheet();
  console.log("¿Oculta?", hoja.isSheetHidden());
  hoja.showSheet();

  // copyTo copia la hoja a una planilla (la misma u otra). La copia se
  // llama "Copia de ..." (o "Copy of ..." si tu cuenta está en inglés).
  const copia = hoja.copyTo(spreadsheet);
  console.log("Copia:", copia.getName());

  // Limpieza: borramos las dos.
  spreadsheet.deleteSheet(copia);
  spreadsheet.deleteSheet(hoja);
  console.log("Hojas temporales borradas.");
}

/**
 * DEMO: las distintas formas de pedir un rango.
 */
function demo_rangos() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);

  console.log("A1 notación:", hoja.getRange("A1:C3").getA1Notation());
  console.log("Por números:", hoja.getRange(1, 1, 3, 3).getA1Notation()); // A1:C3

  // getDataRange: el bloque que va desde A1 hasta la última fila y columna
  // con contenido. Es la forma más común de "agarrar todos los datos".
  console.log("Todos los datos:", hoja.getDataRange().getA1Notation());

  // Una columna entera desde la fila 2 hasta la última con datos (sin el
  // encabezado). Ojo: si la hoja solo tiene el encabezado, getLastRow() - 1
  // da 0, y getRange con 0 filas tira error. Por eso el chequeo.
  const filasDeDatos = hoja.getLastRow() - 1;
  if (filasDeDatos > 0) {
    console.log(
      "Columna C sin encabezado:",
      hoja.getRange(2, 3, filasDeDatos, 1).getA1Notation(),
    );
  }

  // Rangos con nombre de columna completa: "A:A" es toda la columna A, "2:2"
  // toda la fila 2. Útil para formato; para leer, mejor acotar.
  console.log("Columna completa:", hoja.getRange("A:A").getA1Notation());
}

/**
 * DEMO: qué TIPO de dato devuelve cada celda al leerla.
 *
 * getValues respeta el tipo: números como number, fechas como Date,
 * casillas como boolean, y las celdas vacías como "" (texto vacío, no null).
 * getDisplayValues devuelve SIEMPRE texto, tal como se ve en pantalla (con
 * el formato aplicado: "$1.234,50", "23/11/2026").
 */
function demo_tiposDeDatos() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const encabezados = hoja
    .getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0];
  const valores = hoja.getRange(2, 1, 1, hoja.getLastColumn()).getValues()[0];
  const comoSeVe = hoja
    .getRange(2, 1, 1, hoja.getLastColumn())
    .getDisplayValues()[0];

  encabezados.forEach((encabezado, i) => {
    // instanceof Date distingue fechas; typeof diría "object".
    const tipo = valores[i] instanceof Date ? "Date" : typeof valores[i];
    console.log(
      `${encabezado}: valor=${valores[i]} | tipo=${tipo} | se ve como "${comoSeVe[i]}"`,
    );
  });
}
