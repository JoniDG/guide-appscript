/**
 * ============================================================================
 *  SPREADSHEET 4: BUSCAR DATOS EN HOJAS GRANDES
 * ============================================================================
 *
 *  Buscar "fila por fila" con getValue (un viaje por celda) es la forma más
 *  lenta posible. Estas son las alternativas, de la más general a la más
 *  especializada. demo_benchmarkBusqueda las compara con 5.000 filas.
 *
 *  1. TRAER TODO Y BUSCAR EN MEMORIA
 *     getDataRange().getValues() + find/filter. Un solo viaje. Es la opción
 *     por defecto: simple y rápida hasta decenas de miles de filas.
 *
 *  2. TRAER SOLO LA COLUMNA DONDE SE BUSCA
 *     Si la hoja tiene muchas columnas, traer solo una es más liviano.
 *     Después, con el número de fila encontrado, se lee solo esa fila.
 *
 *  3. TEXTFINDER (el "Buscar" de Sheets, desde código)
 *     Busca del lado de Google sin traer los datos a tu código. Ideal para
 *     buscar un texto en TODA la hoja (sin saber en qué columna está) o
 *     para hacer "buscar y reemplazar". Opciones: matchEntireCell (celda
 *     completa vs "contiene"), matchCase (mayúsculas), useRegularExpression.
 *
 *  4. ÍNDICE EN MEMORIA (Map)
 *     Si en UNA misma ejecución hay que buscar MUCHAS veces (por ejemplo,
 *     cruzar 1.000 pedidos con sus clientes), armar primero un Map
 *     "email -> fila" y después cada búsqueda es instantánea. Buscar 1.000
 *     veces con find recorre la lista 1.000 veces; con un Map, nunca.
 *     (Para reusar el índice ENTRE ejecuciones hay que guardarlo en Cache:
 *     tema Estado.)
 *
 *  Bonus: la fórmula QUERY de Sheets puede hacer el filtrado ella misma; ver
 *  demo_formulaQuery.
 * ============================================================================
 */

/**
 * Devuelve todas las filas cuya columna "numeroColumna" es igual a "valor".
 * Técnica 1: trae todo y filtra en memoria.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @param {number} numeroColumna  Columna donde buscar (1 = A).
 * @param {*} valor               Valor exacto a buscar.
 * @returns {Array<Array<*>>}     Las filas encontradas (lista vacía si ninguna).
 */
function buscarFilasPorColumna_(hoja, numeroColumna, valor) {
  // slice(1) saltea los encabezados.
  return hoja
    .getDataRange()
    .getValues()
    .slice(1)
    .filter((fila) => fila[numeroColumna - 1] === valor);
}

/**
 * Devuelve el NÚMERO de fila (como en la hoja, empezando en 1) de la
 * primera fila cuya columna es igual a "valor", o -1 si no está.
 * Técnica 2: trae solo una columna.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @param {number} numeroColumna
 * @param {*} valor
 * @returns {number}
 */
function buscarNumeroDeFila_(hoja, numeroColumna, valor) {
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) {
    return -1;
  }
  // getValues de una columna da [[v1], [v2], ...]; flat() lo aplana a [v1, v2, ...].
  const columna = hoja
    .getRange(2, numeroColumna, ultimaFila - 1, 1)
    .getValues()
    .flat();
  const posicion = columna.indexOf(valor);
  // +2: la posición 0 del array es la fila 2 de la hoja (la 1 es el encabezado).
  return posicion === -1 ? -1 : posicion + 2;
}

/**
 * ¿Existe "valor" en alguna celda de la hoja (celda completa)?
 * Técnica 3: TextFinder.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @param {string} valor
 * @returns {boolean}
 */
function existeEnHoja_(hoja, valor) {
  // findNext devuelve la primera celda que coincide (un Range) o null.
  return (
    hoja.createTextFinder(String(valor)).matchEntireCell(true).findNext() !==
    null
  );
}

/**
 * Arma un índice "valor de la columna -> fila completa".
 * Técnica 4: Map. Si hay valores repetidos, gana la última fila.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @param {number} numeroColumna
 * @returns {Map<*, Array<*>>}
 */
function crearIndice_(hoja, numeroColumna) {
  const indice = new Map();
  for (const fila of hoja.getDataRange().getValues().slice(1)) {
    indice.set(fila[numeroColumna - 1], fila);
  }
  return indice;
}

/**
 * DEMO: cada técnica, buscando el mismo cliente por email.
 */
function demo_tecnicasDeBusqueda() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  // Tomamos un email que sabemos que existe: el de la fila 2500.
  const email = hoja.getRange(2500, COL_CLIENTES.email).getValue();
  console.log("Buscamos:", email);

  // 1. Traer todo y filtrar.
  const filas = buscarFilasPorColumna_(hoja, COL_CLIENTES.email, email);
  console.log("1) Filas encontradas:", JSON.stringify(filas));

  // 2. Solo la columna, y después leer solo esa fila.
  const numeroFila = buscarNumeroDeFila_(hoja, COL_CLIENTES.email, email);
  const fila = hoja
    .getRange(numeroFila, 1, 1, hoja.getLastColumn())
    .getValues()[0];
  console.log(`2) Está en la fila ${numeroFila}:`, JSON.stringify(fila));

  // 3. TextFinder: ¿existe? y ¿en qué celdas?
  console.log("3) ¿Existe?", existeEnHoja_(hoja, email));
  const celdas = hoja
    .createTextFinder("Córdoba")
    .matchEntireCell(true)
    .findAll();
  console.log(
    `3) "Córdoba" aparece en ${celdas.length} celdas. Primera: ${celdas[0].getA1Notation()}`,
  );

  // TextFinder también busca "contiene" y con regex:
  const conAnaGomez = hoja
    .createTextFinder("^ana\\.gomez\\d+@")
    .useRegularExpression(true)
    .findAll();
  console.log(
    `3) Emails que empiezan con ana.gomez<número>: ${conAnaGomez.length}`,
  );

  // 4. Índice: muchas búsquedas en la misma ejecución.
  const indice = crearIndice_(hoja, COL_CLIENTES.email);
  console.log("4) Desde el índice:", JSON.stringify(indice.get(email)));
  console.log("4) ¿Tiene un email inventado?", indice.has("nadie@example.com"));
}

/**
 * DEMO (benchmark): buscar 200 emails con cada técnica.
 *
 * Fijate cómo "find" se vuelve lento al repetirlo muchas veces, y cómo el
 * índice (Map) tarda casi lo mismo para 1 o para 200 búsquedas.
 */
function demo_benchmarkBusqueda() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const columnaEmail = COL_CLIENTES.email;
  // Los 200 emails a buscar: uno de cada 25 filas.
  const todos = hoja.getDataRange().getValues().slice(1);
  const aBuscar = todos
    .filter((_, i) => i % 25 === 0)
    .map((fila) => fila[columnaEmail - 1]);

  const medir = (nombre, buscarTodos) => {
    const inicio = Date.now();
    const encontrados = buscarTodos();
    console.log(
      `${nombre}: ${Date.now() - inicio} ms (${encontrados} encontrados)`,
    );
  };

  medir(
    "A) getValues por cada búsqueda",
    () =>
      // Ojo: trae toda la hoja en CADA búsqueda. Es el error típico.
      aBuscar.filter(
        (email) => buscarFilasPorColumna_(hoja, columnaEmail, email).length > 0,
      ).length,
  );

  medir(
    "B) TextFinder por cada búsqueda",
    () => aBuscar.filter((email) => existeEnHoja_(hoja, email)).length,
  );

  medir("C) getValues una vez + find por cada búsqueda", () => {
    const datos = hoja.getDataRange().getValues();
    return aBuscar.filter((email) =>
      datos.find((fila) => fila[columnaEmail - 1] === email),
    ).length;
  });

  medir("D) getValues una vez + índice Map", () => {
    const indice = crearIndice_(hoja, columnaEmail);
    return aBuscar.filter((email) => indice.has(email)).length;
  });
}

/**
 * DEMO: dejar que Sheets filtre con la fórmula QUERY.
 *
 * QUERY usa un lenguaje parecido a SQL. Las columnas se nombran por la letra
 * que tienen en el rango de origen (A, B, C...). El último parámetro (1)
 * indica cuántas filas de encabezado tiene el origen.
 * La escribimos en la hoja de pruebas y leemos el resultado ya calculado.
 */
function demo_formulaQuery() {
  const hoja = hojaDePruebasLimpia_();
  // Clientes activos de Salta, ordenados por monto descendente, máximo 5.
  // Recordá: setFormula va en inglés y con comas (ver LeerEscribir.js).
  hoja
    .getRange("A1")
    .setFormula(
      `=QUERY('${SHEET_CLIENTES}'!A1:G, "select A, B, F where D = 'Salta' and G = true order by F desc limit 5", 1)`,
    );
  // flush: esperamos a que Sheets calcule la fórmula antes de leer.
  SpreadsheetApp.flush();
  console.log(JSON.stringify(hoja.getDataRange().getValues(), null, 2));
}
