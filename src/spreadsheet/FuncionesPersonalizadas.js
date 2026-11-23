/**
 * ============================================================================
 *  SPREADSHEET 6: FUNCIONES PERSONALIZADAS (=MI_FUNCION() EN UNA CELDA)
 * ============================================================================
 *
 *  Una función de Apps Script se puede usar como fórmula en una celda,
 *  igual que =SUMA() o =PROMEDIO(). Por ejemplo, con la función
 *  PRECIO_CON_IVA de abajo, en cualquier celda podés escribir:
 *      =PRECIO_CON_IVA(100; 0,21)      -> 121
 *  (con ; y , en una planilla de Argentina; con , y . en una de EEUU)
 *
 *  Reglas y límites:
 *    - El nombre NO puede terminar en guion bajo (esas son privadas) y no
 *      tiene que chocar con una fórmula que ya exista en Sheets.
 *    - El comentario de documentación con la etiqueta customfunction (con
 *      arroba adelante, como en las funciones de abajo) hace que la función
 *      aparezca en el autocompletado de la planilla con su descripción.
 *    - Tiene 30 SEGUNDOS como máximo para terminar.
 *    - Corre "sin usuario", con permisos muy limitados:
 *        SÍ puede: leer la planilla donde está (SpreadsheetApp, solo
 *        lectura y solo esa planilla), llamar a URLs externas (UrlFetchApp),
 *        y usar Cache, Properties, Lock y Utilities.
 *        NO puede: escribir en la planilla (solo DEVOLVER un valor), abrir
 *        otras planillas con openById, ni acceder a datos personales
 *        (Gmail, Drive, Calendar...).
 *    - Si recibe un rango (=MI_FUNCION(A1:B3)), le llega como matriz
 *      (array de filas), igual que getValues.
 *    - Si devuelve una matriz, el resultado se "derrama" en varias celdas.
 *    - Sheets guarda el resultado en caché: si los argumentos no cambian,
 *      no la vuelve a ejecutar. Por eso no conviene que dependa de la hora
 *      actual ni de datos al azar.
 *    - Cada celda con la función es UNA ejecución. 1.000 celdas = 1.000
 *      ejecuciones: es lento. Mejor que reciba un rango y devuelva una
 *      columna entera (ver MONTO_CON_DESCUENTO).
 *
 *  setup() escribe ejemplos de todas en la hoja "Funciones personalizadas".
 * ============================================================================
 */

/**
 * Calcula el precio con IVA.
 *
 * @param {number} precio  El precio sin impuestos.
 * @param {number|string} [tasa] La tasa de IVA (0,21 para 21%). Si se omite, 21%.
 * @return {number}        El precio con IVA, redondeado a 2 decimales.
 * @customfunction
 */
function PRECIO_CON_IVA(precio, tasa) {
  // Si no pasan la tasa, en la celda llega como undefined.
  const tasaFinal = tasa === undefined || tasa === "" ? 0.21 : tasa;
  if (typeof precio !== "number") {
    // Tirar un error en una función personalizada hace que la celda
    // muestre #ERROR! con este mensaje al pasar el mouse.
    throw new Error("El precio tiene que ser un número");
  }
  return Math.round(precio * (1 + tasaFinal) * 100) / 100;
}

/**
 * Normaliza un texto: sin acentos, en minúsculas y sin espacios de más.
 *
 * @param {string} texto  El texto a normalizar.
 * @return {string}
 * @customfunction
 */
function NORMALIZAR_TEXTO(texto) {
  // Reutiliza normalizarTexto_ de utils/Texto.js: una función privada se
  // puede usar desde una personalizada sin problema.
  return normalizarTexto_(texto);
}

/**
 * Aplica un descuento a una columna entera de montos.
 * Recibe un RANGO y devuelve una COLUMNA: una sola ejecución para todas
 * las filas (mucho más rápido que una fórmula por celda).
 *
 * @param {Array<Array<number|string>>|number} montos  Un rango de una columna, ej: F2:F100.
 * @param {number} porcentaje     El descuento, ej: 0,1 para 10%.
 * @return {Array<Array<number|string>>}  Una columna con los montos con descuento.
 * @customfunction
 */
function MONTO_CON_DESCUENTO(montos, porcentaje) {
  if (typeof porcentaje !== "number") {
    throw new Error("Falta el porcentaje de descuento (ej: 0,1 para 10%)");
  }
  // Si el rango es de una sola celda, Sheets manda el valor solo (no una
  // matriz). Lo normalizamos para tratar siempre con matrices.
  const matriz = Array.isArray(montos) ? montos : [[montos]];
  return matriz.map((fila) =>
    // Las celdas vacías llegan como "": las dejamos vacías.
    [fila[0] === "" ? "" : Math.round(fila[0] * (1 - porcentaje) * 100) / 100],
  );
}

/**
 * Escribe ejemplos de las funciones personalizadas en la hoja de ejemplo.
 * La llama setup().
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 */
function escribirEjemplosDeFuncionesPersonalizadas_(hoja) {
  // Los separadores dependen de la región de la planilla (ver
  // separadoresDeFormula_ en spreadsheet/LeerEscribir.js).
  const { argumentos: a, decimal: d } = separadoresDeFormula_();
  hoja.clear();
  const formulas = [
    "=PRECIO_CON_IVA(100)",
    `=PRECIO_CON_IVA(100${a} 0${d}105)`,
    '=NORMALIZAR_TEXTO("  José  PÉREZ ")',
    `=MONTO_CON_DESCUENTO('${SHEET_CLIENTES}'!F2:F6${a} 0${d}1)`,
  ];
  // Columna A: el texto de la fórmula (con un apóstrofe adelante para que
  // Sheets lo muestre como texto y no lo calcule). Columna B: la fórmula real.
  const columnaA = [["Fórmula"], ...formulas.map((f) => [`'${f}`])];
  const columnaB = formulas.map((f) => [f]);
  hoja.getRange(1, 1, columnaA.length, 1).setValues(columnaA);
  hoja.getRange("B1").setValue("Resultado");
  hoja.getRange(2, 2, columnaB.length, 1).setFormulas(columnaB);
  hoja.getRange("A1:B1").setFontWeight("bold");
  hoja.autoResizeColumns(1, 2);
}
