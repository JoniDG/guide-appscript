/**
 * ============================================================================
 *  BACKEND 4: SUBIR ARCHIVOS A DRIVE DESDE UNA PÁGINA WEB O UN SISTEMA
 * ============================================================================
 *
 *  Un <form> HTML "normal" con <input type="file"> manda los archivos como
 *  multipart/form-data. Apps Script no interpreta bien ese formato, y esta
 *  API lo rechaza (415). Por eso el archivo se manda como TEXTO en base64,
 *  dentro de un JSON:
 *
 *    POST .../exec/archivos
 *    Content-Type: text/plain        (JSON como text/plain: ver Conceptos.js)
 *    { "token": "...", "nombre": "foto.png", "mimeType": "image/png",
 *      "contenido": "<base64>" }
 *
 *  Desde una página web, el base64 se obtiene con FileReader.readAsDataURL
 *  (y sacando el prefijo "data:image/png;base64,").
 *
 *  Recomendaciones (que aplicamos acá):
 *    - UN archivo por pedido: cada uno tiene su propio límite de tamaño y
 *      de tiempo, y si uno falla los demás no se pierden.
 *    - Límite de tamaño. El base64 pesa ~33% más que el archivo, y un pedido
 *      a Apps Script tiene un tope aproximado de 50 MB.
 *    - Lista de tipos permitidos: si el web app es público, cualquiera con
 *      el token podría subir cualquier cosa a TU Drive. Ojo: el tipo lo
 *      DECLARA quien sube; no comprobamos que el contenido sea de verdad
 *      una imagen o un PDF.
 *    - Limpiar el nombre del archivo.
 * ============================================================================
 */

/** Tamaño máximo de archivo aceptado (10 MB). */
const MAX_BYTES_SUBIDA = 10 * 1024 * 1024;

/** Tipos de archivo aceptados. */
const TIPOS_PERMITIDOS_SUBIDA = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
  "text/csv",
];

/**
 * Carpeta de Drive donde se guardan los archivos subidos por la API.
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function carpetaDeSubidas_() {
  return obtenerOCrearSubcarpeta_(getGuideFolder_(), "Subidas por la API");
}

/**
 * Deja un nombre de archivo seguro: sin barras ni caracteres de control, y
 * no demasiado largo. Si queda vacío, usa un nombre generado.
 *
 * @param {string} nombre
 * @returns {string}
 */
function limpiarNombreDeArchivo_(nombre) {
  const limpio = String(nombre ?? "")
    // [\x00-\x1f] son caracteres "invisibles" de control.
    .replace(/[\\/\x00-\x1f]/g, "_")
    .trim()
    .slice(0, 150);
  return limpio || `archivo-${generarCodigoCorto_(6)}`;
}

/**
 * POST /archivos  (requiere token)
 * Cuerpo: { token, nombre, mimeType, contenido }  (contenido en base64)
 */
function subirArchivo_(pedido) {
  const { nombre, mimeType, contenido } = pedido.body;
  if (typeof contenido !== "string" || contenido === "") {
    throw new HttpError_(400, "Falta 'contenido' (el archivo en base64)");
  }
  if (!TIPOS_PERMITIDOS_SUBIDA.includes(mimeType)) {
    throw new HttpError_(
      415,
      `Tipo no permitido: ${mimeType}. Permitidos: ${TIPOS_PERMITIDOS_SUBIDA.join(", ")}`,
    );
  }
  // Chequeo rápido ANTES de decodificar: 4 caracteres de base64 son 3
  // bytes. Así no gastamos tiempo decodificando algo que vamos a rechazar.
  if ((contenido.length * 3) / 4 > MAX_BYTES_SUBIDA * 1.01) {
    // 413 = "el contenido es demasiado grande".
    throw new HttpError_(
      413,
      `El archivo supera ${MAX_BYTES_SUBIDA / 1024 / 1024} MB`,
    );
  }

  let bytes;
  try {
    bytes = Utilities.base64Decode(contenido);
  } catch (error) {
    throw new HttpError_(400, "'contenido' no es base64 válido");
  }
  if (bytes.length > MAX_BYTES_SUBIDA) {
    throw new HttpError_(
      413,
      `El archivo supera ${MAX_BYTES_SUBIDA / 1024 / 1024} MB`,
    );
  }

  const blob = Utilities.newBlob(
    bytes,
    mimeType,
    limpiarNombreDeArchivo_(nombre),
  );
  const archivo = carpetaDeSubidas_().createFile(blob);
  return {
    status: 201,
    data: {
      id: archivo.getId(),
      nombre: archivo.getName(),
      bytes: bytes.length,
      url: archivo.getUrl(),
    },
  };
}

/** GET /archivos  (requiere token): lista lo subido por la API. */
function listarArchivos_() {
  const archivos = [];
  const iterador = carpetaDeSubidas_().getFiles();
  while (iterador.hasNext()) {
    const archivo = iterador.next();
    if (!archivo.isTrashed()) {
      archivos.push({
        id: archivo.getId(),
        nombre: archivo.getName(),
        url: archivo.getUrl(),
      });
    }
  }
  return { status: 200, data: archivos };
}
