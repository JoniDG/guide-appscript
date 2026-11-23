/**
 * ============================================================================
 *  SPREADSHEET 3: FILAS COMO OBJETOS (USANDO LOS ENCABEZADOS)
 * ============================================================================
 *
 *  El problema de trabajar con filas como arrays:
 *      const email = fila[2];
 *  ¿Qué es el 2? Nadie lo sabe sin mirar la hoja. Y si alguien inserta una
 *  columna nueva en la planilla, el 2 pasa a apuntar a otra cosa y el código
 *  se rompe EN SILENCIO (sigue andando, pero con datos equivocados).
 *
 *  La solución: usar la fila 1 (los encabezados) para convertir cada fila en
 *  un OBJETO:
 *      { id: "C00001", nombre: "Ana Gómez", email: "ana.gomez1@...", ... }
 *  y escribir:
 *      const email = cliente.email;
 *  Ahora se lee solo, y si alguien mueve columnas, sigue funcionando porque
 *  buscamos por NOMBRE de columna, no por posición.
 *
 *  Este es el patrón más útil de toda la guía para trabajar con planillas:
 *  la hoja funciona como una "tabla de base de datos".
 * ============================================================================
 */

/**
 * Lee toda una hoja y devuelve una lista de objetos, uno por fila.
 * Las claves de cada objeto son los encabezados (fila 1).
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @returns {Array<Object>}
 */
function hojaAObjetos_(hoja) {
  // getDataRange().getValues(): UN solo viaje para traer todo.
  // [encabezados, ...filas] separa la primera fila del resto
  // ("desestructuración": encabezados = primera, filas = todas las demás).
  const [encabezados, ...filas] = hoja.getDataRange().getValues();

  return filas.map((fila) => {
    const objeto = {};
    encabezados.forEach((encabezado, i) => {
      objeto[encabezado] = fila[i];
    });
    return objeto;
  });
}

/**
 * Convierte objetos en filas, en el orden de los encabezados de la hoja.
 * Si a un objeto le falta un campo, esa celda queda vacía.
 *
 * @param {string[]} encabezados
 * @param {Array<Object>} objetos
 * @returns {Array<Array<*>>}
 */
function objetosAFilas_(encabezados, objetos) {
  return objetos.map((objeto) =>
    // ?? "": si el campo no existe (undefined) o es null, usar "" (vacío).
    encabezados.map((encabezado) => objeto[encabezado] ?? ""),
  );
}

/**
 * Lee los encabezados (fila 1) de una hoja.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @returns {string[]}
 */
function leerEncabezados_(hoja) {
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
}

/**
 * Agrega objetos al final de una hoja, respetando sus encabezados.
 * Escribe todos juntos con un solo setValues.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @param {Array<Object>} objetos
 */
function agregarObjetos_(hoja, objetos) {
  if (objetos.length === 0) {
    return;
  }
  const filas = objetosAFilas_(leerEncabezados_(hoja), objetos);
  const primeraFila = hoja.getLastRow() + 1;
  const ultimaFila = primeraFila + filas.length - 1;

  // getRange no puede pedir filas que la hoja no tiene (tira error). Si la
  // hoja está "llena" (como Clientes, que tiene justo 5.001 filas), primero
  // agregamos las que falten.
  if (hoja.getMaxRows() < ultimaFila) {
    hoja.insertRowsAfter(hoja.getMaxRows(), ultimaFila - hoja.getMaxRows());
  }
  hoja.getRange(primeraFila, 1, filas.length, filas[0].length).setValues(filas);
}

/**
 * Actualiza algunos campos de la fila cuyo campo "campoId" vale "id".
 * Ejemplo: actualizarPorId_(hoja, "id", "C00010", { ciudad: "Salta" })
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @param {string} campoId   Nombre del encabezado que identifica la fila.
 * @param {*} id             Valor a buscar.
 * @param {Object} cambios   Solo los campos que cambian.
 * @returns {boolean}        true si encontró la fila y la actualizó.
 */
function actualizarPorId_(hoja, campoId, id, cambios) {
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const columnaId = encabezados.indexOf(campoId);
  if (columnaId === -1) {
    throw new Error(
      `La hoja "${hoja.getName()}" no tiene la columna "${campoId}"`,
    );
  }

  // findIndex devuelve la posición de la primera fila que cumple la
  // condición, o -1 si ninguna.
  const posicion = datos.findIndex(
    (fila, i) => i > 0 && fila[columnaId] === id,
  );
  if (posicion === -1) {
    return false;
  }

  // Escribimos SOLO las celdas que cambian, no la fila entera. Reescribir
  // la fila completa con lo que leímos tendría dos problemas:
  //   - Las fórmulas de esa fila se convertirían en valores fijos.
  //   - Si alguien editó otra celda de la fila mientras tanto, la pisaríamos.
  // Es un viaje por campo, pero normalmente se cambian pocos campos.
  for (const [campo, valor] of Object.entries(cambios)) {
    const columna = encabezados.indexOf(campo);
    if (columna === -1) {
      throw new Error(
        `La hoja "${hoja.getName()}" no tiene la columna "${campo}"`,
      );
    }
    // +1 en los dos: posiciones del array -> fila y columna de la hoja.
    hoja.getRange(posicion + 1, columna + 1).setValue(valor);
  }
  return true;
}

/**
 * DEMO: leer la hoja Clientes como objetos y hacer consultas tipo
 * "base de datos" con filter, map, reduce y sort.
 */
function demo_consultasConObjetos() {
  const clientes = hojaAObjetos_(
    getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES),
  );
  console.log("Total de clientes:", clientes.length);
  console.log("Primer cliente:", JSON.stringify(clientes[0]));

  // filter: quedarse con los que cumplen una condición (como un WHERE).
  const activosDeCordoba = clientes.filter(
    (c) => c.activo && c.ciudad === "Córdoba",
  );
  console.log("Activos de Córdoba:", activosDeCordoba.length);

  // reduce: "acumular" todos los elementos en un solo valor (como un SUM).
  const montoTotal = activosDeCordoba.reduce((suma, c) => suma + c.monto, 0);
  console.log("Monto total de esos clientes:", montoTotal.toFixed(2));

  // Agrupar: cantidad de clientes por ciudad (como un GROUP BY).
  const porCiudad = {};
  for (const c of clientes) {
    porCiudad[c.ciudad] = (porCiudad[c.ciudad] || 0) + 1;
  }
  console.log("Clientes por ciudad:", JSON.stringify(porCiudad, null, 2));

  // sort + slice: los 3 con mayor monto (como ORDER BY ... LIMIT 3).
  // [...clientes] hace una copia, porque sort modifica la lista original.
  const top3 = [...clientes].sort((a, b) => b.monto - a.monto).slice(0, 3);
  // map: transformar cada elemento (como un SELECT de algunas columnas).
  console.log(
    "Top 3 por monto:",
    JSON.stringify(top3.map((c) => `${c.nombre}: ${c.monto}`)),
  );
}

/**
 * DEMO: agregar y actualizar usando objetos (en la hoja de pruebas).
 */
function demo_agregarYActualizarObjetos() {
  const hoja = hojaDePruebasLimpia_();
  hoja.getRange("A1:C1").setValues([["id", "producto", "precio"]]);

  agregarObjetos_(hoja, [
    { id: 1, producto: "Manzana", precio: 100 },
    { id: 2, producto: "Pera", precio: 120 },
    // Los campos pueden venir en cualquier orden, y si falta uno queda vacío:
    { precio: 90, id: 3, producto: "Banana" },
    { id: 4, producto: "Kiwi" },
  ]);

  const actualizado = actualizarPorId_(hoja, "id", 2, { precio: 150 });
  console.log("¿Se actualizó el id 2?", actualizado);
  console.log(
    "¿Existe el id 99?",
    actualizarPorId_(hoja, "id", 99, { precio: 1 }),
  );
  console.log("Resultado:", JSON.stringify(hojaAObjetos_(hoja)));
}
