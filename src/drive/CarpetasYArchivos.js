/**
 * ============================================================================
 *  DRIVE 1: CARPETAS Y ARCHIVOS
 * ============================================================================
 *
 *  DriveApp es el servicio para manejar Google Drive: carpetas, archivos,
 *  permisos. Los objetos principales:
 *    Folder -> una carpeta.
 *    File   -> un archivo (un PDF, una imagen, pero también una planilla
 *              o un documento de Google: para Drive todo es un "File").
 *
 *  ITERADORES
 *  Cuando DriveApp devuelve "varias cosas" (los archivos de una carpeta, el
 *  resultado de una búsqueda), NO devuelve una lista, sino un ITERADOR: un
 *  objeto al que se le van pidiendo los elementos de a uno:
 *      const archivos = carpeta.getFiles();
 *      while (archivos.hasNext()) {     // ¿queda alguno?
 *        const archivo = archivos.next(); // dame el siguiente
 *      }
 *  Es así porque una carpeta puede tener miles de archivos, y traerlos
 *  todos de golpe sería lento.
 *
 *  NOMBRES vs IDs
 *  En Drive puede haber muchos archivos o carpetas con el MISMO nombre (Drive
 *  no lo impide). Por eso getFoldersByName / getFilesByName devuelven un
 *  iterador, no un elemento. El ID, en cambio, es único: si tenés el ID,
 *  usá getFileById / getFolderById. El ID está en la URL:
 *      https://drive.google.com/drive/folders/<ID>
 *      https://docs.google.com/spreadsheets/d/<ID>/edit
 *
 *  BORRAR
 *  DriveApp no borra definitivamente: setTrashed(true) manda a la papelera
 *  (de donde se puede recuperar durante 30 días). Para borrar para siempre
 *  hace falta el servicio avanzado de Drive (tema Avanzado).
 *
 *  Todos los demos trabajan dentro de la subcarpeta "Demos Drive" de la
 *  carpeta de la guía, así no tocan nada tuyo.
 * ============================================================================
 */

/**
 * Busca una subcarpeta por nombre dentro de "padre". Si no existe, la crea.
 * Si hay varias con ese nombre, devuelve la primera.
 *
 * @param {GoogleAppsScript.Drive.Folder} padre
 * @param {string} nombre
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function obtenerOCrearSubcarpeta_(padre, nombre) {
  // Si encontramos una (que no esté en la papelera), la usamos; si no, la
  // creamos.
  return primeroFueraDePapelera_(padre.getFoldersByName(nombre)) ?? padre.createFolder(nombre);
}

/**
 * Devuelve el primer elemento de un iterador de Drive que NO esté en la
 * papelera, o null si no hay ninguno.
 *
 * ¿Por qué hace falta? Porque getFilesByName, getFoldersByName, getFiles,
 * getFolders y searchFiles TAMBIÉN devuelven lo que está en la papelera
 * (sigue "estando" en su carpeta). Sin este filtro, por ejemplo, podríamos
 * guardar un archivo nuevo adentro de una carpeta que borramos, y nunca
 * lo veríamos.
 *
 * @param {GoogleAppsScript.Drive.FileIterator|GoogleAppsScript.Drive.FolderIterator} iterador
 * @returns {*}  El archivo o carpeta, o null.
 */
function primeroFueraDePapelera_(iterador) {
  while (iterador.hasNext()) {
    const elemento = iterador.next();
    if (!elemento.isTrashed()) {
      return elemento;
    }
  }
  return null;
}

/**
 * Devuelve (creándola si hace falta) la carpeta donde escriben los demos
 * del tema Drive.
 *
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function carpetaDeDemos_() {
  return obtenerOCrearSubcarpeta_(getGuideFolder_(), "Demos Drive");
}

/**
 * Devuelve la carpeta "año/mes" para una fecha, creando lo que falte.
 * Ejemplo: para el 23/11/2026 devuelve la carpeta 2026/11 dentro de "base".
 * Es un patrón muy común para ordenar archivos generados automáticamente
 * (facturas, reportes, backups).
 *
 * @param {GoogleAppsScript.Drive.Folder} base
 * @param {Date} fecha
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function carpetaPorFecha_(base, fecha) {
  const anio = obtenerOCrearSubcarpeta_(base, formatearFecha_(fecha, "yyyy"));
  return obtenerOCrearSubcarpeta_(anio, formatearFecha_(fecha, "MM"));
}

/**
 * DEMO: listar lo que hay en la carpeta de la guía, con datos de cada archivo.
 */
function demo_recorrerCarpeta() {
  const carpeta = getGuideFolder_();
  console.log(`Carpeta: ${carpeta.getName()} (${carpeta.getUrl()})`);

  const subcarpetas = carpeta.getFolders();
  while (subcarpetas.hasNext()) {
    console.log("  Subcarpeta:", subcarpetas.next().getName());
  }

  // Recorremos los archivos de la carpeta de la guía y los de "Demos Drive"
  // (que se llena al correr demo_crearCarpetasYArchivos).
  const carpetas = [carpeta, carpetaDeDemos_()];
  for (const c of carpetas) {
    const archivos = c.getFiles();
    while (archivos.hasNext()) {
      const archivo = archivos.next();
      console.log(
        `  [${c.getName()}] ${archivo.getName()} | tipo: ${archivo.getMimeType()} | ` +
          `${archivo.getSize()} bytes | modificado: ${formatearFecha_(archivo.getLastUpdated(), "dd/MM/yyyy HH:mm")}`,
      );
    }
  }
  // Nota: getSize() da 0 para planillas, documentos y presentaciones de
  // Google, porque no son un archivo con un tamaño fijo: se "arman" cuando
  // se exportan (a PDF, a Excel...).
}

/**
 * DEMO: crear carpetas y archivos, renombrar, describir, copiar y mover.
 */
function demo_crearCarpetasYArchivos() {
  const demos = carpetaDeDemos_();

  // Crear un archivo de texto. createFile(nombre, contenido, tipo).
  // MimeType.PLAIN_TEXT = "text/plain". El "MIME type" es la forma estándar
  // de decir de qué tipo es un archivo (text/plain, application/pdf,
  // image/png...).
  const archivo = demos.createFile(
    "nota.txt",
    `Archivo creado por la guía el ${formatearFecha_(new Date(), "dd/MM/yyyy HH:mm:ss")}`,
    MimeType.PLAIN_TEXT,
  );
  console.log("Creado:", archivo.getName(), archivo.getUrl());

  // Renombrar y agregar una descripción (se ve en el panel de detalles).
  archivo.setName("nota (renombrada).txt");
  archivo.setDescription("Ejemplo de la guía de Apps Script");

  // Copiar: makeCopy(nombre, carpetaDestino).
  const copia = archivo.makeCopy("nota (copia).txt", demos);
  console.log("Copia:", copia.getName());

  // Mover a una carpeta por fecha: Demos Drive/2026/11.
  const destino = carpetaPorFecha_(demos, new Date());
  copia.moveTo(destino);
  console.log(
    `Movida a: ${destino.getParents().next().getName()}/${destino.getName()}`,
  );

  // Leer el contenido de un archivo de texto: getBlob() da los datos
  // ("blob", ver Blobs.js) y getDataAsString() los pasa a texto.
  console.log("Contenido:", archivo.getBlob().getDataAsString());
}

/**
 * DEMO: mandar a la papelera y recuperar.
 */
function demo_papelera() {
  const archivo = carpetaDeDemos_().createFile(
    "para-borrar.txt",
    "chau",
    MimeType.PLAIN_TEXT,
  );
  archivo.setTrashed(true);
  console.log("¿En la papelera?", archivo.isTrashed());

  // Mientras esté en la papelera se puede recuperar.
  archivo.setTrashed(false);
  console.log("¿Y ahora?", archivo.isTrashed());

  // Lo dejamos en la papelera definitivamente para no ensuciar la carpeta.
  archivo.setTrashed(true);
}

/**
 * DEMO: limpia la carpeta "Demos Drive" (manda todo a la papelera).
 * Útil después de probar los demos de este tema.
 */
function demo_limpiarCarpetaDeDemos() {
  const demos = carpetaDeDemos_();
  let cantidad = 0;
  // getFiles y getFolders también devuelven lo que YA está en la papelera:
  // lo salteamos para no contarlo dos veces.
  const archivos = demos.getFiles();
  while (archivos.hasNext()) {
    const archivo = archivos.next();
    if (!archivo.isTrashed()) {
      archivo.setTrashed(true);
      cantidad++;
    }
  }
  const carpetas = demos.getFolders();
  while (carpetas.hasNext()) {
    const carpeta = carpetas.next();
    if (!carpeta.isTrashed()) {
      // Mandar una carpeta a la papelera manda también todo lo que tiene adentro.
      carpeta.setTrashed(true);
      cantidad++;
    }
  }
  console.log(`Enviados a la papelera: ${cantidad} elementos.`);
}
