/**
 * ============================================================================
 *  SPREADSHEET 5: FORMATO Y HERRAMIENTAS DE LA PLANILLA
 * ============================================================================
 *
 *  Todo lo que hacés con el mouse en Sheets (colores, negritas, bordes,
 *  listas desplegables, filtros, proteger celdas...) se puede hacer por
 *  código. Útil para generar reportes que salen "lindos" automáticamente.
 *
 *  Todos los demos trabajan sobre la hoja "Formato", que se borra y se
 *  vuelve a crear en cada demo (ver prepararHojaDeFormato_).
 *
 *  Regla de rendimiento (igual que con los datos): aplicar el formato a un
 *  RANGO entero de una vez, no celda por celda.
 * ============================================================================
 */

/**
 * Recrea la hoja "Formato" desde cero (sin formato, validaciones, reglas,
 * filtros y protecciones) y le carga una tablita de ejemplo.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function prepararHojaDeFormato_() {
  // Una hoja con formato acumula muchas cosas que hoja.clear() NO borra:
  // validaciones y casillas, celdas combinadas, reglas de formato
  // condicional, filtros, bandas de colores y protecciones (cada una se
  // saca por separado). Para empezar de cero, recreamos la hoja entera
  // (ver recrearHoja_ en LeerEscribir.js).
  const hoja = recrearHoja_(SHEET_FORMATO);

  const datos = [
    ["Producto", "Categoría", "Precio", "Stock", "Vence", "Activo"],
    ["Manzana", "Fruta", 1200.5, 40, new Date(2026, 11, 20), true],
    ["Pera", "Fruta", 1500, 0, new Date(2026, 10, 30), true],
    ["Leche", "Lácteo", 980, 12, new Date(2026, 11, 2), false],
    ["Queso", "Lácteo", 7800.99, 3, new Date(2027, 0, 15), true],
    ["Pan", "Panadería", 2100, 25, new Date(2026, 10, 25), true],
  ];
  hoja.getRange(1, 1, datos.length, datos[0].length).setValues(datos);
  return hoja;
}

/**
 * DEMO: fuentes, colores, alineación, bordes, anchos y filas congeladas.
 */
function demo_formatoBasico() {
  const hoja = prepararHojaDeFormato_();
  const encabezado = hoja.getRange("A1:F1");

  // Los métodos "set..." devuelven el mismo rango, así que se pueden
  // encadenar uno detrás de otro.
  encabezado
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#1a73e8") // colores en formato hexadecimal (#RRGGBB)
    .setHorizontalAlignment("center");

  // setBorder(arriba, izquierda, abajo, derecha, verticalesInternos,
  //           horizontalesInternos). true = poner borde, null = no tocar.
  hoja.getRange("A1:F6").setBorder(true, true, true, true, true, true);

  hoja.setFrozenRows(1); // la fila 1 queda fija al hacer scroll
  hoja.autoResizeColumns(1, 6); // ancho automático según el contenido
  hoja.setColumnWidth(1, 140); // o un ancho fijo, en píxeles

  // Una nota (el triangulito negro en la esquina de la celda).
  hoja.getRange("C1").setNote("Precio unitario en pesos");
  console.log("Listo. Mirá la hoja 'Formato'.");
}

/**
 * DEMO: formatos de número, moneda, porcentaje y fecha.
 *
 * El formato cambia cómo se VE el número, no el número guardado. La celda
 * sigue valiendo 1200.5 aunque muestre "$ 1.200,50".
 * Los separadores de miles y decimales (punto o coma) los decide la
 * configuración regional de la planilla, no el formato.
 */
function demo_formatosDeNumero() {
  const hoja = prepararHojaDeFormato_();
  hoja.getRange("C2:C6").setNumberFormat("$ #,##0.00"); // moneda con 2 decimales
  hoja.getRange("D2:D6").setNumberFormat("0"); // entero
  // En los formatos de la PLANILLA, "mm" junto a "dd" o "yyyy" es el mes.
  // (Distinto de Utilities.formatDate, donde el mes es "MM".)
  hoja.getRange("E2:E6").setNumberFormat("dd/mm/yyyy");

  hoja.getRange("H1:H2").setValues([["Margen"], [0.257]]);
  hoja.getRange("H2").setNumberFormat("0.0%"); // se ve 25,7%

  console.log("Valor guardado en C2:", hoja.getRange("C2").getValue());
  console.log("Cómo se ve C2:", hoja.getRange("C2").getDisplayValue());
}

/**
 * DEMO: formato condicional (colores que cambian según el valor) y bandas
 * de colores alternados.
 */
function demo_formatoCondicional() {
  const hoja = prepararHojaDeFormato_();

  // Las reglas se "construyen" con newConditionalFormatRule() y build().
  const sinStock = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberEqualTo(0)
    .setBackground("#f4c7c3") // rojo claro
    .setFontColor("#a50e0e")
    .setRanges([hoja.getRange("D2:D6")])
    .build();

  const caros = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(5000)
    .setBold(true)
    .setRanges([hoja.getRange("C2:C6")])
    .build();

  // Con una fórmula se puede pintar la FILA entera según otra columna.
  // Las referencias con $ fijan la columna (F) y dejan variar la fila.
  const inactivos = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied("=$F2=FALSE")
    .setFontColor("#9e9e9e")
    .setRanges([hoja.getRange("A2:F6")])
    .build();

  // setConditionalFormatRules REEMPLAZA todas las reglas de la hoja. Para
  // agregar sin borrar las existentes: hoja.getConditionalFormatRules(),
  // sumarle las nuevas, y volver a setearlas.
  hoja.setConditionalFormatRules([sinStock, caros, inactivos]);

  // Bandas: filas de colores alternados (Formato > Colores alternados).
  hoja
    .getRange("A1:F6")
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  console.log("Listo: sin stock en rojo, caros en negrita, inactivos en gris.");
}

/**
 * DEMO: validación de datos: listas desplegables, casillas y rangos de números.
 */
function demo_validaciones() {
  const hoja = prepararHojaDeFormato_();

  // Lista desplegable con opciones fijas. El segundo parámetro (true)
  // muestra la flechita del desplegable.
  const categorias = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Fruta", "Lácteo", "Panadería", "Otro"], true)
    .setAllowInvalid(false) // rechaza valores que no estén en la lista
    .build();
  hoja.getRange("B2:B6").setDataValidation(categorias);

  // Casillas de verificación: la celda pasa a valer true / false.
  hoja.getRange("F2:F6").insertCheckboxes();

  // Solo números entre 0 y 1000, con un texto de ayuda.
  const stockValido = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 1000)
    .setHelpText("El stock tiene que ser un número entre 0 y 1000")
    .setAllowInvalid(false)
    .build();
  hoja.getRange("D2:D6").setDataValidation(stockValido);

  console.log(
    "Probá escribir 'Verdura' en B2 o -5 en D2: la planilla lo rechaza.",
  );
}

/**
 * DEMO: filtros, rangos con nombre, protección y celdas combinadas.
 */
function demo_herramientas() {
  const spreadsheet = getGuideSpreadsheet_();
  const hoja = prepararHojaDeFormato_();

  // Filtro (Datos > Crear un filtro). Además lo dejamos filtrando: solo
  // los que tienen stock mayor a 0.
  const filtro = hoja.getRange("A1:F6").createFilter();
  filtro.setColumnFilterCriteria(
    4, // columna D (Stock)
    SpreadsheetApp.newFilterCriteria().whenNumberGreaterThan(0).build(),
  );

  // Rango con nombre: le ponemos un nombre a un rango y después se puede
  // usar en fórmulas (=SUM(Precios)) o pedir por código.
  spreadsheet.setNamedRange("Precios", hoja.getRange("C2:C6"));
  console.log(
    "Rango 'Precios':",
    spreadsheet.getRangeByName("Precios").getA1Notation(),
  );

  // Protección: los encabezados quedan protegidos. setWarningOnly(true)
  // solo MUESTRA UNA ADVERTENCIA al editar (no bloquea a nadie).
  // Sin esa línea, la protección bloquea la edición, con dos detalles:
  //   - El dueño de la planilla siempre puede editar.
  //   - Al crearla, la protección COPIA los editores actuales de la
  //     planilla. Para dejar solo a ciertas personas hay que sacarlos con
  //     proteccion.removeEditors(proteccion.getEditors()) y después
  //     agregar a quien quieras con proteccion.addEditor(email).
  const proteccion = hoja
    .getRange("A1:F1")
    .protect()
    .setDescription("Encabezados");
  proteccion.setWarningOnly(true);

  // Combinar celdas (Formato > Combinar celdas).
  hoja
    .getRange("A8:F8")
    .merge()
    .setValue("Reporte generado por código")
    .setHorizontalAlignment("center");

  console.log(
    "Listo: filtro por stock > 0, rango con nombre, encabezados protegidos.",
  );
}

/**
 * DEMO: links y texto con estilos dentro de una celda ("rich text").
 */
function demo_linksYTextoEnriquecido() {
  const hoja = prepararHojaDeFormato_();

  // Forma 1: la fórmula HYPERLINK.
  hoja
    .getRange("H1")
    .setFormula(
      `=HYPERLINK("https://developers.google.com/apps-script"${separadoresDeFormula_().argumentos} "Documentación")`,
    );

  // Forma 2: "rich text": un link, o partes del texto con estilos distintos.
  const conLink = SpreadsheetApp.newRichTextValue()
    .setText("Ver la planilla")
    .setLinkUrl(getGuideSpreadsheet_().getUrl())
    .build();
  hoja.getRange("H2").setRichTextValue(conLink);

  const negrita = SpreadsheetApp.newTextStyle()
    .setBold(true)
    .setForegroundColor("#d93025")
    .build();
  const mixto = SpreadsheetApp.newRichTextValue()
    .setText("Atención: revisar stock")
    .setTextStyle(0, 9, negrita) // solo los caracteres 0 a 8 ("Atención:")
    .build();
  hoja.getRange("H3").setRichTextValue(mixto);
  console.log("Listo: mirá las celdas H1 a H3 de la hoja 'Formato'.");
}
