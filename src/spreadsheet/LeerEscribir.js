/**
 * ============================================================================
 *  SPREADSHEET 2: LEER Y ESCRIBIR (Y POR QUÉ HACERLO "EN BLOQUE")
 * ============================================================================
 *
 *  LA REGLA MÁS IMPORTANTE DE APPS SCRIPT CON PLANILLAS:
 *  cada vez que el código le habla a la planilla (getValue, setValue,
 *  getRange().getValues()...), es un "viaje" a los servidores de Sheets que
 *  tarda. Leer 1 celda o 10.000 celdas en UN viaje tarda casi lo mismo.
 *  Así que:
 *
 *      MAL:  un getValue/setValue por cada celda, dentro de un for.
 *      BIEN: UN getValues para traer todo, trabajar en memoria (arrays),
 *            y UN setValues para escribir todo junto.
 *
 *  La diferencia no es chica. Medido en esta guía con la hoja Clientes:
 *    - Leer 300 celdas de a una: ~1.000 ms. Leer las 5.000 filas completas
 *      de una vez: ~365 ms. Por celda, ~50 veces más rápido.
 *    - Buscar 200 emails trayendo la hoja en cada búsqueda: ~91 segundos.
 *      Trayéndola una sola vez: ~0,3 segundos (Busqueda.js).
 *    - Escribir: la diferencia es menor (~2 veces), porque Apps Script
 *      agrupa solo los setValue seguidos. Pero si entre escritura y
 *      escritura hay una lectura, ese agrupamiento se corta y vuelve a ser
 *      lento. Mejor no depender de eso.
 *  Probalo con demo_benchmarkLectura y demo_benchmarkEscritura.
 *
 *  getValues() devuelve una "matriz": un array de filas, y cada fila es un
 *  array de celdas. Para la hoja:
 *          A       B
 *     1  "Ana"    30
 *     2  "Luis"   25
 *  getValues() devuelve: [["Ana", 30], ["Luis", 25]]
 *  y valores[1][0] es "Luis" (fila 2 de la hoja = posición 1 del array).
 *
 *  setValues(matriz) exige que la matriz tenga EXACTAMENTE el mismo tamaño
 *  que el rango. Si el rango es de 2x2, la matriz tiene que ser de 2x2; si
 *  no, tira el error "The number of rows/columns in the data does not match".
 * ============================================================================
 */

/**
 * Borra una hoja y la vuelve a crear vacía, en la misma posición.
 *
 * ¿Por qué no alcanza con hoja.clear()? Lo comprobamos probando: después de
 * clear(), algunas celdas de la hoja de pruebas SIGUIERON con el formato de
 * fecha de un demo anterior, y un 220 se mostraba como "07/08/1900".
 * Además clear() no saca validaciones, celdas combinadas, formato
 * condicional, filtros, bandas de colores ni protecciones (habría que sacar
 * cada cosa por separado). Borrar la hoja y crearla de nuevo garantiza que
 * quede realmente vacía.
 *
 * Ojo: solo para hojas "de trabajo" como las de los demos. Borrar una hoja
 * rompe las fórmulas de OTRAS hojas que la usaban, y se pierde su historial.
 *
 * @param {string} nombre
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function recrearHoja_(nombre) {
  const spreadsheet = getGuideSpreadsheet_();
  const vieja = spreadsheet.getSheetByName(nombre);
  // getIndex empieza en 1, pero insertSheet espera la posición empezando
  // en 0: por eso el -1.
  const posicion = vieja ? vieja.getIndex() - 1 : spreadsheet.getSheets().length;
  if (vieja) {
    spreadsheet.deleteSheet(vieja);
  }
  return spreadsheet.insertSheet(nombre, posicion);
}

/**
 * Devuelve la hoja de pruebas de escritura, vacía de verdad.
 * Los demos escriben ahí, así nunca tocan datos reales.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function hojaDePruebasLimpia_() {
  return recrearHoja_(SHEET_PRUEBAS);
}

/**
 * Averigua qué separadores usa ESTA planilla en sus fórmulas.
 *
 * Los NOMBRES de las funciones en setFormula van siempre en inglés (SUM,
 * TODAY, QUERY), pero los SEPARADORES dependen de la configuración regional
 * de la planilla (Archivo > Configuración > Configuración regional):
 *
 *   Región                        Argumentos   Decimales   Ejemplo
 *   Argentina, España, Brasil...      ;            ,       =ROUND(1,5; 0)
 *   Estados Unidos, México...         ,            .       =ROUND(1.5, 0)
 *
 *  Si usás el separador equivocado, la celda muestra #ERROR!.
 *
 * Cómo lo averiguamos: le "preguntamos" a la planilla. Escribimos el número
 * 1,5 en una celda y miramos cómo lo muestra: si usa coma para los
 * decimales, los argumentos se separan con punto y coma.
 *
 * @returns {{argumentos: string, decimal: string}}
 */
function separadoresDeFormula_() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_PRUEBAS);
  // Usamos la última celda de la hoja, donde ningún demo escribe.
  const celda = hoja.getRange(hoja.getMaxRows(), hoja.getMaxColumns());
  celda.setValue(1.5).setNumberFormat("0.0");
  const comoSeVe = celda.getDisplayValue(); // "1,5" o "1.5"
  celda.clear();
  return comoSeVe.includes(",")
    ? { argumentos: ";", decimal: "," }
    : { argumentos: ",", decimal: "." };
}

/**
 * DEMO: leer y escribir una celda, y un bloque de celdas.
 */
function demo_leerYEscribirBasico() {
  const hoja = hojaDePruebasLimpia_();

  // Una celda.
  hoja.getRange("A1").setValue("Hola");
  console.log("A1 dice:", hoja.getRange("A1").getValue());

  // Un bloque: 3 filas x 2 columnas, empezando en A3.
  const datos = [
    ["Producto", "Precio"],
    ["Manzana", 100],
    ["Pera", 120],
  ];
  // El tamaño del rango sale del tamaño de los datos: así nunca falla.
  hoja.getRange(3, 1, datos.length, datos[0].length).setValues(datos);

  const leido = hoja.getRange("A3:B5").getValues();
  console.log("Bloque leído:", JSON.stringify(leido));
  console.log("Precio de la pera:", leido[2][1]); // fila 3 del bloque, columna 2
}

/**
 * DEMO: agregar filas al final con appendRow.
 *
 * appendRow es cómodo, y en la práctica cada llamada termina en una fila
 * distinta aunque dos ejecuciones escriban a la vez (Google no lo documenta
 * como garantía). La alternativa "getLastRow() + 1 y escribir ahí" NO es
 * segura: dos ejecuciones simultáneas pueden leer el mismo getLastRow y
 * escribir en la misma fila. Para una garantía real, LockService (tema
 * Estado).
 *
 * Pero appendRow es UN viaje por fila: para muchas filas, mejor un setValues.
 */
function demo_appendRow() {
  const hoja = hojaDePruebasLimpia_();
  hoja.appendRow(["Fecha", "Evento"]);
  hoja.appendRow([new Date(), "Primer evento"]);
  hoja.appendRow([new Date(), "Segundo evento"]);
  console.log("Filas ahora:", hoja.getLastRow()); // 3
}

/**
 * DEMO: escribir fórmulas desde el código.
 *
 * Importante: en setFormula los NOMBRES de las funciones van en inglés
 * (=SUM, no =SUMA; Sheets los traduce solo al mostrarlos), pero los
 * SEPARADORES de argumentos y decimales dependen de la región de la
 * planilla. Por eso armamos las fórmulas con separadoresDeFormula_().
 */
function demo_formulas() {
  const hoja = hojaDePruebasLimpia_();
  hoja.getRange("A1:B3").setValues([
    ["Producto", "Precio"],
    ["Manzana", 100],
    ["Pera", 120],
  ]);

  hoja.getRange("A4").setValue("Total");
  hoja.getRange("B4").setFormula("=SUM(B2:B3)");

  // Fórmulas con argumentos o decimales: usamos los separadores de la
  // planilla. En Argentina queda "=ROUND(B4*1,21; 0)".
  const sep = separadoresDeFormula_();
  hoja.getRange("A5").setValue("Total con IVA, redondeado");
  hoja.getRange("B5").setFormula(`=ROUND(B4*1${sep.decimal}21${sep.argumentos} 0)`);

  // Para varias fórmulas de una vez: setFormulas con una matriz.
  hoja.getRange("C1").setValue("Con IVA");
  hoja.getRange("C2:C3").setFormulas([[`=B2*1${sep.decimal}21`], [`=B3*1${sep.decimal}21`]]);

  // Leer la fórmula vs leer el resultado.
  console.log("Fórmula de B4:", hoja.getRange("B4").getFormula());
  console.log("Resultado de B4:", hoja.getRange("B4").getValue());
  console.log("Fórmula de B5:", hoja.getRange("B5").getFormula());
  console.log("Resultado de B5:", hoja.getRange("B5").getValue());
}

/**
 * DEMO (benchmark): leer celda por celda vs leer todo de una vez.
 * Usa la hoja "Clientes" (5.000 filas creadas por setup()).
 */
function demo_benchmarkLectura() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const filasALeer = 300; // celda por celda es tan lento que usamos pocas

  // Forma LENTA: un viaje por celda.
  let inicio = Date.now();
  let sumaLenta = 0;
  for (let fila = 2; fila < 2 + filasALeer; fila++) {
    sumaLenta += hoja.getRange(fila, COL_CLIENTES.monto).getValue();
  }
  const msLento = Date.now() - inicio;

  // Forma RÁPIDA: un solo viaje para TODAS las filas (¡5.000, no 300!).
  inicio = Date.now();
  const todos = hoja.getDataRange().getValues();
  let sumaRapida = 0;
  for (let i = 1; i <= filasALeer; i++) {
    sumaRapida += todos[i][COL_CLIENTES.monto - 1]; // -1: columna de hoja -> posición del array
  }
  const msRapido = Date.now() - inicio;

  console.log(`Celda por celda (${filasALeer} celdas): ${msLento} ms`);
  console.log(
    `Todo de una vez (${todos.length} filas completas): ${msRapido} ms`,
  );
  console.log(`Misma suma: ${sumaLenta.toFixed(2)} = ${sumaRapida.toFixed(2)}`);
}

/**
 * DEMO (benchmark): escribir celda por celda vs escribir todo de una vez.
 */
function demo_benchmarkEscritura() {
  const hoja = hojaDePruebasLimpia_();
  const cantidad = 200;
  // Aplicamos ya el clear() de hojaDePruebasLimpia_, para que no se cuele
  // dentro del tiempo que medimos.
  SpreadsheetApp.flush();

  let inicio = Date.now();
  for (let i = 1; i <= cantidad; i++) {
    hoja.getRange(i, 1).setValue(i);
  }
  // flush() obliga a que se apliquen los cambios pendientes ahora mismo.
  // Apps Script a veces agrupa escrituras; sin flush la medición sería
  // engañosa.
  SpreadsheetApp.flush();
  const msLento = Date.now() - inicio;

  inicio = Date.now();
  // Armamos la matriz en memoria: [[1], [2], [3], ...]
  const matriz = [];
  for (let i = 1; i <= cantidad; i++) {
    matriz.push([i]);
  }
  hoja.getRange(1, 2, cantidad, 1).setValues(matriz);
  SpreadsheetApp.flush();
  const msRapido = Date.now() - inicio;

  console.log(`setValue en un for (${cantidad} celdas): ${msLento} ms`);
  console.log(`Un solo setValues (${cantidad} celdas): ${msRapido} ms`);
}

/**
 * DEMO: modificar muchas filas: leer todo, cambiar en memoria, escribir todo.
 * Copiamos 20 clientes a la hoja de pruebas y les aumentamos el monto 10%.
 */
function demo_leerModificarEscribir() {
  const clientes = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const hoja = hojaDePruebasLimpia_();

  // 1. Leer (un viaje).
  const datos = clientes
    .getRange(1, 1, 21, clientes.getLastColumn())
    .getValues();

  // 2. Modificar en memoria (cero viajes). Empezamos en 1 para saltear los
  //    encabezados (fila 0 del array).
  for (let i = 1; i < datos.length; i++) {
    const montoActual = datos[i][COL_CLIENTES.monto - 1];
    datos[i][COL_CLIENTES.monto - 1] =
      Math.round(montoActual * 1.1 * 100) / 100;
  }

  // 3. Escribir (un viaje).
  hoja.getRange(1, 1, datos.length, datos[0].length).setValues(datos);
  console.log(
    `Copiados y actualizados ${datos.length - 1} clientes en "${SHEET_PRUEBAS}".`,
  );
}

/**
 * DEMO: borrar filas que cumplen una condición.
 *
 * Dos formas:
 *  a) deleteRow por cada fila: lento (un viaje por fila) y con una trampa:
 *     al borrar la fila 5, la 6 pasa a ser la 5. Si recorrés de arriba hacia
 *     abajo, te salteás filas. Por eso, si se hace así, se recorre DE ABAJO
 *     HACIA ARRIBA.
 *  b) Filtrar en memoria y reescribir todo: rápido (2 o 3 viajes). Es la
 *     forma recomendada cuando son muchas filas.
 */
function demo_borrarFilasConCondicion() {
  const hoja = hojaDePruebasLimpia_();
  const datos = [
    ["Producto", "Stock"],
    ["A", 0],
    ["B", 5],
    ["C", 0],
    ["D", 0],
    ["E", 2],
  ];
  hoja.getRange(1, 1, datos.length, 2).setValues(datos);

  // Forma a) de abajo hacia arriba, borrando los que tienen stock 0.
  const valores = hoja.getDataRange().getValues();
  for (let i = valores.length - 1; i >= 1; i--) {
    if (valores[i][1] === 0) {
      hoja.deleteRow(i + 1); // +1: posición del array -> número de fila
    }
  }
  console.log(
    "Forma a), quedan:",
    JSON.stringify(hoja.getDataRange().getValues()),
  );

  // Forma b) volvemos a cargar los datos y filtramos en memoria.
  hoja.clear();
  hoja.getRange(1, 1, datos.length, 2).setValues(datos);
  const [encabezado, ...filas] = hoja.getDataRange().getValues();
  const conStock = filas.filter((fila) => fila[1] !== 0);
  const resultado = [encabezado, ...conStock];
  hoja.clearContents();
  hoja
    .getRange(1, 1, resultado.length, resultado[0].length)
    .setValues(resultado);
  console.log(
    "Forma b), quedan:",
    JSON.stringify(hoja.getDataRange().getValues()),
  );
}

/**
 * DEMO: ordenar un rango por una columna.
 */
function demo_ordenar() {
  const hoja = hojaDePruebasLimpia_();
  hoja.getRange("A1:B5").setValues([
    ["Nombre", "Edad"],
    ["Luis", 25],
    ["Ana", 30],
    ["Carla", 22],
    ["Bruno", 41],
  ]);
  // sort ordena en la planilla misma. Ordenamos solo los datos (sin la fila
  // de encabezado), por la columna 2 (Edad), de mayor a menor.
  // Ojo: "column" es el número de columna de la HOJA (B = 2), no la
  // posición dentro del rango. Acá coinciden porque el rango empieza en A.
  hoja.getRange("A2:B5").sort({ column: 2, ascending: false });
  console.log(
    "Ordenado por edad:",
    JSON.stringify(hoja.getRange("A2:B5").getValues()),
  );
}
