/**
 * ============================================================================
 *  DRIVE 3: BLOBS (LOS DATOS DE UN ARCHIVO), BASE64, CSV Y ZIP
 * ============================================================================
 *
 *  ¿Qué es un Blob?
 *  Es un "paquete de datos": el CONTENIDO de un archivo (sus bytes) junto
 *  con su nombre y su tipo (MIME type). No es un archivo de Drive todavía:
 *  vive solo en la memoria de la ejecución. Con un Blob se puede:
 *    - Crear un archivo en Drive:      carpeta.createFile(blob)
 *    - Adjuntarlo a un mail:           MailApp.sendEmail({..., attachments: [blob]})
 *    - Mandarlo a una API:             UrlFetchApp.fetch(url, {payload: blob})
 *    - Convertirlo a otro formato:     blob.getAs(MimeType.PDF)
 *
 *  ¿De dónde sale un Blob?
 *    - De un archivo de Drive:         archivo.getBlob()
 *    - De un texto o de bytes:         Utilities.newBlob(datos, tipo, nombre)
 *    - De una respuesta de internet:   UrlFetchApp.fetch(url).getBlob()
 *    - De un formulario web:           el archivo que sube un usuario
 *
 *  Límite: en la práctica, alrededor de 50 MB (por ejemplo, para crear un
 *  archivo en Drive con un Blob o para descargar algo con UrlFetchApp).
 *
 *  Base64 (ver utils/Hash.js) es la forma de mandar un Blob como TEXTO:
 *  por ejemplo dentro de un JSON enviado al web app (tema Backend).
 * ============================================================================
 */

/**
 * Un ícono PNG de 32x32 (un árbol) escrito en base64. Viene del código
 * original de la guía (función base64toBlob).
 */
const ICONO_ARBOL_BASE64 =
  "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";

/**
 * Convierte un texto en base64 en un archivo de Drive.
 * Es exactamente lo que hace un backend que recibe archivos en base64.
 *
 * @param {GoogleAppsScript.Drive.Folder} carpeta
 * @param {string} base64     El contenido en base64 (sin el prefijo "data:...;base64,").
 * @param {string} mimeType   Ej: "image/png", "application/pdf".
 * @param {string} nombre     Nombre del archivo a crear.
 * @returns {GoogleAppsScript.Drive.File}
 */
function base64AArchivo_(carpeta, base64, mimeType, nombre) {
  // base64Decode: texto base64 -> bytes. newBlob: bytes -> Blob con tipo y nombre.
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, nombre);
  return carpeta.createFile(blob);
}

/**
 * DEMO: crear un Blob, mirar sus propiedades y guardarlo como archivo.
 */
function demo_blobs() {
  const blob = Utilities.newBlob(
    "Hola desde un Blob",
    MimeType.PLAIN_TEXT,
    "saludo.txt",
  );
  console.log("Nombre:", blob.getName());
  console.log("Tipo:", blob.getContentType());
  console.log("Bytes:", blob.getBytes().length);
  console.log("Como texto:", blob.getDataAsString());

  const archivo = carpetaDeDemos_().createFile(blob);
  console.log("Guardado en Drive:", archivo.getUrl());

  // Y al revés: de un archivo de Drive a Blob.
  const deVuelta = archivo.getBlob();
  console.log("Leído desde Drive:", deVuelta.getDataAsString());
}

/**
 * DEMO: de base64 a imagen en Drive, y de imagen a base64.
 */
function demo_base64AArchivo() {
  const imagen = base64AArchivo_(
    carpetaDeDemos_(),
    ICONO_ARBOL_BASE64,
    MimeType.PNG,
    "arbol.png",
  );
  console.log("Imagen creada:", imagen.getUrl(), `(${imagen.getSize()} bytes)`);

  // El camino inverso: archivo -> bytes -> base64.
  const otraVez = Utilities.base64Encode(imagen.getBlob().getBytes());
  console.log("¿El base64 es el mismo?", otraVez === ICONO_ARBOL_BASE64);
}

/**
 * DEMO: exportar datos de una hoja a un archivo CSV, y leer un CSV.
 *
 * CSV ("valores separados por comas") es el formato más simple para pasar
 * tablas entre sistemas: cada fila es una línea y cada celda va separada
 * por comas. Si una celda tiene comas, comillas o saltos de línea, va entre
 * comillas dobles, y las comillas internas se duplican ("").
 */
function demo_csvIdaYVuelta() {
  const clientes = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const filas = clientes
    .getRange(1, 1, 11, clientes.getLastColumn())
    .getDisplayValues();

  // Armar el CSV a mano, escapando cada celda. Hay que poner entre comillas
  // las celdas con comillas, comas o saltos de línea (\n, y también \r, el
  // salto de línea de Windows).
  const escaparCelda = (valor) => {
    const texto = String(valor);
    return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const csv = filas.map((fila) => fila.map(escaparCelda).join(",")).join("\n");

  const archivo = carpetaDeDemos_().createFile(
    "clientes.csv",
    csv,
    MimeType.CSV,
  );
  console.log("CSV creado:", archivo.getUrl());

  // Leer un CSV: Utilities.parseCsv lo convierte en una matriz (como
  // getValues), respetando las comillas. Todo llega como TEXTO.
  const leido = Utilities.parseCsv(archivo.getBlob().getDataAsString());
  console.log(
    `Leídas ${leido.length} filas. Encabezados: ${leido[0].join(" | ")}`,
  );
  console.log("Primera fila de datos:", leido[1].join(" | "));

  // parseCsv acepta otro separador (por ejemplo ";", común en Excel en español):
  console.log(
    "Con punto y coma:",
    JSON.stringify(Utilities.parseCsv("a;b\n1;2", ";")),
  );
}

/**
 * DEMO: comprimir varios archivos en un .zip y descomprimirlo.
 */
function demo_zip() {
  const blobs = [
    Utilities.newBlob("Archivo uno", MimeType.PLAIN_TEXT, "uno.txt"),
    Utilities.newBlob("Archivo dos", MimeType.PLAIN_TEXT, "dos.txt"),
    Utilities.newBlob(
      Utilities.base64Decode(ICONO_ARBOL_BASE64),
      MimeType.PNG,
      "arbol.png",
    ),
  ];
  const zip = Utilities.zip(blobs, "paquete.zip");
  const archivoZip = carpetaDeDemos_().createFile(zip);
  console.log(
    `Zip creado: ${archivoZip.getUrl()} (${archivoZip.getSize()} bytes)`,
  );

  // unzip devuelve la lista de Blobs que había adentro.
  const contenido = Utilities.unzip(archivoZip.getBlob());
  console.log("Adentro del zip:", contenido.map((b) => b.getName()).join(", "));
}
