/**
 * ============================================================================
 *  DRIVE 2: BUSCAR ARCHIVOS Y CARPETAS
 * ============================================================================
 *
 *  getFilesByName busca por nombre EXACTO. Para cualquier otra búsqueda
 *  (que contenga un texto, de un tipo, modificados después de una fecha,
 *  dentro de una carpeta...) se usa searchFiles con una "query": un texto
 *  con condiciones, como el buscador avanzado de Drive.
 *
 *  Condiciones más usadas (DriveApp usa la sintaxis de la versión 2 de la
 *  API de Drive, por eso el nombre es "title" y no "name"):
 *
 *    title = 'reporte.pdf'            nombre exacto
 *    title contains 'reporte'         alguna PALABRA del nombre EMPIEZA con
 *                                     "reporte" (ojo: 'MiReporte' no coincide,
 *                                     'Mi reporte' sí)
 *    fullText contains 'factura'      el CONTENIDO del archivo lo contiene
 *    mimeType = 'application/pdf'     de un tipo (ver MimeType)
 *    modifiedDate > '2026-01-01T00:00:00'  modificado después de esa fecha
 *                                     (fecha y hora, en hora UTC)
 *    'ID_CARPETA' in parents          dentro de esa carpeta (solo el primer
 *                                     nivel, no en subcarpetas)
 *    trashed = false                  que no esté en la papelera
 *    starred = true                   destacado
 *
 *  Se combinan con and / or / not y paréntesis. Los textos van entre
 *  comillas SIMPLES. Si el texto tiene una comilla simple (O'Brien), hay
 *  que escaparla con barra invertida: 'O\'Brien'.
 *
 *  OJO: searchFiles por defecto también devuelve archivos de la PAPELERA.
 *  Casi siempre conviene agregar "and trashed = false". Lo mismo pasa con
 *  getFilesByName, getFoldersByName, getFiles y getFolders (ahí se filtra
 *  con isTrashed(); ver primeroFueraDePapelera_ en CarpetasYArchivos.js).
 * ============================================================================
 */

/**
 * Busca archivos con una query y devuelve una lista (no un iterador) con
 * los primeros "maximo" resultados.
 *
 * @param {string} query
 * @param {number} maximo  Para no recorrer miles de archivos sin querer.
 * @returns {GoogleAppsScript.Drive.File[]}
 */
function buscarArchivos_(query, maximo) {
  const iterador = DriveApp.searchFiles(query);
  const resultado = [];
  while (iterador.hasNext() && resultado.length < maximo) {
    resultado.push(iterador.next());
  }
  return resultado;
}

/**
 * Escapa un texto para usarlo entre comillas simples dentro de una query.
 * Ej: O'Brien -> O\'Brien
 *
 * @param {string} texto
 * @returns {string}
 */
function escaparParaQuery_(texto) {
  // Primero las barras invertidas, después las comillas simples.
  return String(texto).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * DEMO: distintas búsquedas. Corré antes demo_crearCarpetasYArchivos para
 * que haya archivos de ejemplo.
 */
function demo_buscarArchivos() {
  const demos = carpetaDeDemos_();
  const mostrar = (titulo, archivos) =>
    console.log(
      `${titulo}: ${archivos.length} -> ${archivos.map((a) => a.getName()).join(", ")}`,
    );

  mostrar(
    "Con 'nota' en el nombre (en todo tu Drive)",
    buscarArchivos_("title contains 'nota' and trashed = false", 10),
  );

  mostrar(
    "Archivos de texto dentro de Demos Drive",
    buscarArchivos_(
      `'${demos.getId()}' in parents and mimeType = 'text/plain' and trashed = false`,
      10,
    ),
  );

  // Fecha en formato ISO (yyyy-MM-dd'T'HH:mm:ss), en hora UTC.
  const haceUnDia = Utilities.formatDate(
    sumarDias_(new Date(), -1),
    "UTC",
    "yyyy-MM-dd'T'HH:mm:ss",
  );
  mostrar(
    "Planillas de Google modificadas en las últimas 24 hs",
    buscarArchivos_(
      `mimeType = '${MimeType.GOOGLE_SHEETS}' and modifiedDate > '${haceUnDia}' and trashed = false`,
      10,
    ),
  );

  const conComilla = escaparParaQuery_("O'Brien");
  mostrar(
    `Nombre con comilla (${conComilla})`,
    buscarArchivos_(`title contains '${conComilla}' and trashed = false`, 10),
  );
}

/**
 * DEMO: buscar carpetas y recorrer "hacia arriba" (los padres).
 */
function demo_buscarCarpetas() {
  const carpetas = DriveApp.searchFolders(
    "title contains 'Demos Drive' and trashed = false",
  );
  while (carpetas.hasNext()) {
    const carpeta = carpetas.next();
    // getParents: las carpetas que contienen a esta (en Drive actual es una).
    const padres = carpeta.getParents();
    const padre = padres.hasNext() ? padres.next().getName() : "(sin padre)";
    console.log(`${carpeta.getName()} está dentro de: ${padre}`);
  }
}

/**
 * DEMO: iterar MUCHOS archivos sin pasarse del límite de 6 minutos.
 *
 * Un iterador de Drive puede "pausarse": getContinuationToken() devuelve un
 * texto que permite seguir más tarde (en otra ejecución) desde donde
 * quedamos, con DriveApp.continueFileIterator(token). El token vence (dura
 * alrededor de una semana). Es la base de los procesos largos del tema
 * Estado. Acá lo mostramos con 2 archivos por
 * "tanda".
 */
function demo_iteradorConContinuacion() {
  const query = "trashed = false";
  const iterador = DriveApp.searchFiles(query);
  for (let i = 0; i < 2 && iterador.hasNext(); i++) {
    console.log("Tanda 1:", iterador.next().getName());
  }

  // En la vida real, este token se guardaría en las Propiedades del script
  // y la siguiente ejecución (por ejemplo, un trigger) seguiría desde acá.
  const token = iterador.getContinuationToken();

  const continuado = DriveApp.continueFileIterator(token);
  for (let i = 0; i < 2 && continuado.hasNext(); i++) {
    console.log("Tanda 2:", continuado.next().getName());
  }
}
