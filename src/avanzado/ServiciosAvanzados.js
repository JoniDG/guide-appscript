/**
 * ============================================================================
 *  AVANZADO 1: SERVICIOS AVANZADOS (LAS APIs COMPLETAS DE GOOGLE)
 * ============================================================================
 *
 *  SpreadsheetApp, DriveApp, GmailApp... son servicios "simples": cómodos,
 *  pero no tienen TODO lo que ofrecen las APIs de Google. Los SERVICIOS
 *  AVANZADOS dan acceso a la API completa, con la misma forma que la
 *  documentación oficial de cada API (los mismos nombres de campos).
 *
 *  Se activan en el editor (Servicios + , a la izquierda) o en
 *  appsscript.json, en "dependencies" > "enabledAdvancedServices". Esta
 *  guía activa dos (mirá src/appsscript.json):
 *    Sheets  (API de Google Sheets v4)
 *    Drive   (API de Google Drive v3)
 *  Una vez activados, aparecen como objetos globales: Sheets.Spreadsheets...,
 *  Drive.Files...
 *
 *  ¿Cuándo conviene usarlos?
 *    - Para hacer algo que el servicio simple NO puede: convertir un Excel a
 *      planilla de Google, borrar un archivo para siempre, compartir sin
 *      mandar el mail de aviso, pedir solo algunos campos de un archivo.
 *    - Para hacer MUCHAS operaciones en una sola llamada (batchUpdate):
 *      formato, filas, hojas... todo junto.
 *  Para lo cotidiano, el servicio simple alcanza y es más fácil de leer.
 *
 *  Cómo leer la documentación: la API de Sheets está documentada como
 *  "pedidos HTTP" (https://developers.google.com/sheets/api/reference/rest).
 *  En Apps Script, el pedido spreadsheets.values.batchGet se escribe
 *  Sheets.Spreadsheets.Values.batchGet(id, opciones). Dos detalles:
 *    - En los pedidos con CUERPO, el cuerpo va PRIMERO y el ID después:
 *      batchUpdate(cuerpo, id), Files.create(metadatos, archivo),
 *      Permissions.create(permiso, idArchivo, opciones).
 *    - "delete" se escribe "remove" (es una palabra reservada de
 *      JavaScript): Drive.Files.remove(id) borra un archivo PARA SIEMPRE.
 * ============================================================================
 */

/**
 * DEMO: leer VARIOS rangos de distintas hojas en UNA sola llamada.
 */
function demo_sheetsLeerVariosRangos() {
  const id = getGuideSpreadsheet_().getId();
  const respuesta = Sheets.Spreadsheets.Values.batchGet(id, {
    ranges: [
      `${SHEET_CLIENTES}!A1:C3`,
      `${SHEET_TAREAS}!A1:B3`,
      `${INDEX_SHEET_NAME}!A1`,
    ],
    // UNFORMATTED_VALUE: los números como números. Sin esto, la API los
    // devuelve como TEXTO formateado ("1.878,30"), a diferencia de getValues.
    // Ojo: igual no es idéntico a getValues: las FECHAS salen como número
    // de serie (ver spreadsheet/FechasEnPlanillas.js), no como Date.
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  // valueRanges: un resultado por rango, en el mismo orden.
  const lineas = respuesta.valueRanges.map((rango) => `${rango.range}: ${JSON.stringify(rango.values)}`);
  console.log(lineas.join("\n"));
  avisarSiSePuede_(`Tres rangos leídos en UNA llamada:\n\n${lineas.join("\n\n")}`, true);
}

/**
 * DEMO: muchos cambios de formato en UNA llamada con batchUpdate.
 * Cada "request" es una operación (ver la lista completa en la
 * documentación de spreadsheets.batchUpdate). Trabaja sobre la hoja Pruebas.
 */
function demo_sheetsBatchUpdate() {
  const planilla = getGuideSpreadsheet_();
  const hoja = hojaDePruebasLimpia_();
  hoja.getRange("A1:C4").setValues([
    ["Producto", "Precio", "Stock"],
    ["Manzana", 1200, 40],
    ["Pera", 1500, 0],
    ["Queso", 7800, 3],
  ]);
  // IMPORTANTE al mezclar SpreadsheetApp con la API: SpreadsheetApp junta
  // los cambios y los aplica más tarde. La API no se entera de eso, así que
  // antes de llamarla forzamos que se apliquen (si no, por ejemplo, el
  // ajuste de ancho mediría columnas todavía vacías).
  SpreadsheetApp.flush();
  // La API identifica las hojas por su sheetId (un número), no por nombre.
  const sheetId = hoja.getSheetId();

  Sheets.Spreadsheets.batchUpdate(
    {
      requests: [
        // 1. Congelar la primera fila.
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // 2. Encabezado en negrita con fondo azul claro. Los colores van de
        //    0 a 1 (no de 0 a 255).
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.91, green: 0.94, blue: 1 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
        // 3. Ancho automático de las columnas A a C.
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 3,
            },
          },
        },
      ],
    },
    planilla.getId(),
  );
  console.log(
    "Tres cambios de formato aplicados en UNA llamada. Mirá la hoja Pruebas.",
  );
}

/**
 * DEMO: convertir un Excel (.xlsx) en una planilla de Google. DriveApp no
 * puede; la API de Drive sí: se "sube" el archivo pidiendo como tipo
 * final el de una planilla de Google.
 *
 * Para tener un Excel de prueba, exportamos la planilla de la guía a .xlsx
 * (ver drive/Convertir.js) y lo convertimos de vuelta. (El formato xlsx
 * exporta el libro COMPLETO, con todas sus hojas: el parámetro gid, que
 * elige UNA hoja, sirve para pdf y csv.)
 */
function demo_driveConvertirExcel() {
  const planilla = getGuideSpreadsheet_();
  const xlsx = exportarPlanilla_(
    planilla.getId(),
    { format: "xlsx" },
    "Guía.xlsx",
  );

  // Drive.Files.create(metadatos, contenido): con mimeType de planilla de
  // Google, Drive CONVIERTE el Excel al subirlo.
  const convertido = Drive.Files.create(
    {
      name: "Guía (convertida desde Excel)",
      mimeType: MimeType.GOOGLE_SHEETS,
      parents: [carpetaDeDemos_().getId()],
    },
    xlsx,
  );
  const url = `https://docs.google.com/spreadsheets/d/${convertido.id}/edit`;
  console.log(`Convertido: ${url}`);
  avisarSiSePuede_(`Excel convertido a planilla de Google (en Demos Drive):\n\n${url}`, true);
}

/**
 * DEMO: listar archivos pidiendo SOLO algunos campos ("fields"). Con la
 * API de Drive se elige qué datos traer: menos datos, respuestas más
 * rápidas. La consulta (q) usa la sintaxis de la API v3 ("name", no
 * "title" como DriveApp: ver drive/Busqueda.js).
 */
function demo_driveListarConCampos() {
  const respuesta = Drive.Files.list({
    q: `'${carpetaDeDemos_().getId()}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 10,
  });
  // ?? []: por si la respuesta no trae la lista cuando no hay archivos.
  for (const archivo of respuesta.files ?? []) {
    console.log(
      `${archivo.name} | ${archivo.mimeType} | ${archivo.size ?? "-"} bytes | ${archivo.modifiedTime}`,
    );
  }
}

/**
 * Comparte un archivo con alguien SIN mandarle el mail de aviso de Google
 * (DriveApp.addViewer no lo permite: ver drive/Permisos.js).
 *
 * No hay demo que lo ejecute, para no compartir nada con nadie sin querer.
 * Uso: compartirSinAviso_(idArchivo, "ana@example.com", "reader")
 * Ojo: sin el mail de aviso solo se puede compartir con cuentas de Google
 * (a un email que no es de Google, la única forma de invitarlo es el mail).
 *
 * @param {string} idArchivo
 * @param {string} email
 * @param {"reader"|"commenter"|"writer"} rol
 */
function compartirSinAviso_(idArchivo, email, rol) {
  Drive.Permissions.create(
    { role: rol, type: "user", emailAddress: email },
    idArchivo,
    {
      sendNotificationEmail: false,
    },
  );
}
