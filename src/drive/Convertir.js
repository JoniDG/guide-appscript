/**
 * ============================================================================
 *  DRIVE 4: CREAR, COPIAR Y CONVERTIR ARCHIVOS (PDF, EXCEL, PLANTILLAS)
 * ============================================================================
 *
 *  Casos de uso muy comunes en el trabajo:
 *    - Generar un PDF de una planilla (o de UNA hoja, o de un rango) para
 *      mandarlo por mail o guardarlo.
 *    - Exportar una planilla de Google a Excel (.xlsx).
 *    - Usar un archivo como PLANTILLA: copiarlo y completar la copia.
 *
 *  Dos formas de convertir:
 *    1. blob.getAs(MimeType.PDF): la más simple. Convierte el archivo
 *       COMPLETO (todas las hojas de una planilla) a PDF. Solo sirve para
 *       PDF (y para imágenes entre sí).
 *    2. La URL de "exportar" de Google: la misma que usa el menú
 *       Archivo > Descargar. Permite elegir UNA hoja, un rango, tamaño de
 *       hoja, orientación, y otros formatos (xlsx, csv, ods). Se pide con
 *       UrlFetchApp, mandando el "token" del usuario para que Google sepa
 *       que tenemos permiso (la primera vez pide autorizar "conectarse a un
 *       servicio externo").
 *       Ojo: esa URL no es una API oficial documentada (es la que usa la
 *       interfaz de Sheets), así que Google podría cambiarla. Y si se llama
 *       muchas veces seguidas, puede responder 429 ("demasiados pedidos"):
 *       en un loop, conviene esperar un poco entre exportaciones.
 *
 *  ¿Y convertir un Excel a planilla de Google? Hace falta el servicio
 *  avanzado de Drive (tema Avanzado); DriveApp solo no puede.
 * ============================================================================
 */

/**
 * Crea una planilla nueva DENTRO de una carpeta.
 *
 * SpreadsheetApp.create siempre la crea en la raíz de "Mi unidad"; después
 * hay que moverla. Lo mismo pasa con DocumentApp.create, SlidesApp.create...
 *
 * @param {string} nombre
 * @param {GoogleAppsScript.Drive.Folder} carpeta
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function crearPlanillaEnCarpeta_(nombre, carpeta) {
  const planilla = SpreadsheetApp.create(nombre);
  // La planilla (SpreadsheetApp) y el archivo (DriveApp) son la misma cosa
  // vista desde dos servicios distintos. El ID los conecta.
  DriveApp.getFileById(planilla.getId()).moveTo(carpeta);
  return planilla;
}

/**
 * Descarga una planilla (o una hoja, o un rango) usando la URL de exportar.
 *
 * @param {string} idPlanilla
 * @param {Object} opciones  Parámetros de la exportación, por ejemplo:
 *   { format: "pdf", gid: 0, range: "A1:G30", size: "A4", portrait: true,
 *     fitw: true, gridlines: false }
 *   - format: "pdf", "xlsx", "csv", "ods"...
 *   - gid: el ID de la HOJA (sheet.getSheetId()). Sin gid, exporta todas
 *     (en csv, solo la primera).
 *   - range: un rango en notación A1 (solo con gid).
 * @param {string} nombre  Nombre para el Blob resultante.
 * @returns {GoogleAppsScript.Base.Blob}
 */
function exportarPlanilla_(idPlanilla, opciones, nombre) {
  // Convertimos { format: "pdf", gid: 0 } en "format=pdf&gid=0".
  const parametros = Object.entries(opciones)
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(valor)}`)
    .join("&");
  const url = `https://docs.google.com/spreadsheets/d/${idPlanilla}/export?${parametros}`;

  const respuesta = UrlFetchApp.fetch(url, {
    // ScriptApp.getOAuthToken(): el "pase" con los permisos que el usuario
    // le dio a este script. Sin él, Google respondería que no tenemos acceso.
    // Necesita los permisos de Drive y de "conectarse a un servicio externo";
    // Apps Script los detecta solo (si algún día fijás los permisos a mano en
    // appsscript.json, acordate de incluir los dos).
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    // Para leer nosotros el código de error en vez de que tire excepción
    // (tema Requests).
    muteHttpExceptions: true,
  });
  if (respuesta.getResponseCode() !== 200) {
    throw new Error(
      `No se pudo exportar (código ${respuesta.getResponseCode()})`,
    );
  }
  return respuesta.getBlob().setName(nombre);
}

/**
 * Busca la planilla "Reporte de ejemplo" que crea
 * demo_crearPlanillaYConvertirAPdf (ignorando las que estén en la papelera).
 *
 * @returns {GoogleAppsScript.Drive.File}
 */
function buscarReporteDeEjemplo_() {
  const reporte = primeroFueraDePapelera_(carpetaDeDemos_().getFilesByName("Reporte de ejemplo"));
  if (reporte === null) {
    throw new Error("Primero ejecutá demo_crearPlanillaYConvertirAPdf");
  }
  return reporte;
}

/**
 * DEMO: crear una planilla en la carpeta de demos, cargarle datos y
 * convertirla a PDF con getAs.
 */
function demo_crearPlanillaYConvertirAPdf() {
  const carpeta = carpetaDeDemos_();
  const planilla = crearPlanillaEnCarpeta_("Reporte de ejemplo", carpeta);
  const hoja = planilla.getSheets()[0];
  hoja.getRange("A1:C4").setValues([
    ["Producto", "Cantidad", "Precio"],
    ["Manzana", 10, 1200],
    ["Pera", 5, 1500],
    ["Banana", 12, 900],
  ]);
  hoja.getRange("A1:C1").setFontWeight("bold");
  // Los cambios de la planilla tienen que estar guardados antes de
  // convertirla; si no, el PDF puede salir desactualizado o vacío.
  SpreadsheetApp.flush();
  console.log("Planilla creada:", planilla.getUrl());

  const pdf = planilla.getAs(MimeType.PDF).setName("Reporte de ejemplo.pdf");
  const archivoPdf = carpeta.createFile(pdf);
  console.log("PDF:", archivoPdf.getUrl());
}

/**
 * DEMO: exportar SOLO un rango de UNA hoja a PDF, con opciones de página.
 * Usa las primeras 30 filas de la hoja Clientes.
 */
function demo_exportarRangoAPdf() {
  const planilla = getGuideSpreadsheet_();
  const hoja = planilla.getSheetByName(SHEET_CLIENTES);

  const pdf = exportarPlanilla_(
    planilla.getId(),
    {
      format: "pdf",
      gid: hoja.getSheetId(), // qué hoja
      range: "A1:G30", // qué parte
      size: "A4",
      portrait: false, // false = horizontal
      fitw: true, // ajustar al ancho de la página
      gridlines: false, // sin las líneas de la cuadrícula
      sheetnames: false,
      printtitle: false,
    },
    "Clientes (primeros 29).pdf",
  );
  const archivo = carpetaDeDemos_().createFile(pdf);
  console.log("PDF del rango:", archivo.getUrl());
}

/**
 * DEMO: exportar la planilla "Reporte de ejemplo" a Excel (.xlsx).
 * Corré antes demo_crearPlanillaYConvertirAPdf.
 */
function demo_exportarAExcel() {
  const reporte = buscarReporteDeEjemplo_();
  const xlsx = exportarPlanilla_(
    reporte.getId(),
    { format: "xlsx" },
    "Reporte de ejemplo.xlsx",
  );
  const archivo = carpetaDeDemos_().createFile(xlsx);
  console.log("Excel:", archivo.getUrl(), "| tipo:", archivo.getMimeType());
}

/**
 * DEMO: usar una planilla como PLANTILLA.
 * Copiamos "Reporte de ejemplo" y completamos la copia con otros datos.
 */
function demo_usarPlantilla() {
  const plantilla = buscarReporteDeEjemplo_();
  const nombre = `Reporte ${formatearFecha_(new Date(), "yyyy-MM-dd HH.mm")}`;
  const copia = plantilla.makeCopy(
    nombre,
    carpetaPorFecha_(carpetaDeDemos_(), new Date()),
  );

  // makeCopy devuelve un File (DriveApp). Para escribir en él como planilla,
  // lo abrimos con SpreadsheetApp usando su ID.
  const planilla = SpreadsheetApp.openById(copia.getId());
  planilla
    .getSheets()[0]
    .getRange("A2:C2")
    .setValues([["Kiwi", 3, 2500]]);
  console.log("Copia completada:", planilla.getUrl());
}
