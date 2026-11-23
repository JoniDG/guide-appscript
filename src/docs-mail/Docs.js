/**
 * ============================================================================
 *  DOCS Y MAIL 2: GOOGLE DOCS (DOCUMENTOS DESDE PLANTILLAS, A PDF Y POR MAIL)
 * ============================================================================
 *
 *  El caso de uso estrella en cualquier oficina: tener un documento
 *  PLANTILLA (una constancia, un presupuesto, un contrato) con marcadores
 *  como {{nombre}} o {{monto}}, y generar una copia por cliente con los
 *  datos reemplazados, convertida a PDF y mandada por mail.
 *
 *  Cómo está hecho un documento (DocumentApp):
 *    Document            -> el archivo
 *      Body              -> el cuerpo (también hay Header y Footer)
 *        Paragraph       -> cada párrafo (los títulos también son párrafos)
 *        Table           -> tablas, con TableRow y TableCell
 *        ListItem        -> ítems de listas
 *          Text          -> el texto, al que se le aplica formato
 *
 *  LOS DOS DETALLES QUE MÁS ERRORES CAUSAN
 *    1. Después de modificar un documento, llamá a doc.saveAndClose()
 *       ANTES de convertirlo a PDF. Si no, el PDF puede salir con el
 *       contenido VIEJO (los cambios todavía no se guardaron).
 *    2. body.replaceText(buscar, reemplazo) interpreta "buscar" como una
 *       EXPRESIÓN REGULAR: las llaves de {{nombre}} tienen un significado
 *       especial y conviene "escaparlas". Y el reemplazo puede tener
 *       problemas con caracteres como "$" (justo el de los montos). Por
 *       eso acá reemplazamos con findText + insertText (reemplazarMarcador_),
 *       que inserta el valor tal cual.
 *
 *  La guía crea su propia plantilla (obtenerPlantillaDeConstancia_) la
 *  primera vez, en la carpeta de la guía. Abrila y cambiale el diseño
 *  como quieras: mientras los marcadores sigan ahí, sigue funcionando.
 * ============================================================================
 */

/** Marcadores de la plantilla (los que se reemplazan por datos). */
const MARCADORES_CONSTANCIA = [
  "{{nombre}}",
  "{{id}}",
  "{{email}}",
  "{{ciudad}}",
  "{{monto}}",
  "{{fecha_alta}}",
  "{{fecha_emision}}",
];

/**
 * Escapa un texto para usarlo dentro de una expresión regular: "{{id}}" ->
 * "\{\{id\}\}". findText y replaceText de DocumentApp usan expresiones
 * regulares.
 *
 * @param {string} texto
 * @returns {string}
 */
function escaparParaRegex_(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reemplaza TODAS las apariciones de un marcador por un valor, en una
 * sección del documento (cuerpo, encabezado o pie). Usa findText para
 * encontrar cada aparición e insertText para poner el valor TAL CUAL
 * (sin que "$" u otros caracteres se interpreten de forma especial).
 *
 * @param {GoogleAppsScript.Document.Body|GoogleAppsScript.Document.HeaderSection|GoogleAppsScript.Document.FooterSection} seccion
 * @param {string} marcador  Ej: "{{nombre}}".
 * @param {string} valor
 */
function reemplazarMarcador_(seccion, marcador, valor) {
  // Si el valor contuviera el marcador, el while de abajo no terminaría nunca.
  if (valor.includes(marcador)) {
    throw new Error(`El valor de ${marcador} contiene el propio marcador`);
  }
  const patron = escaparParaRegex_(marcador);
  let encontrado = seccion.findText(patron);
  while (encontrado !== null) {
    const texto = encontrado.getElement().asText();
    const inicio = encontrado.getStartOffset();
    const fin = encontrado.getEndOffsetInclusive();
    if (valor === "") {
      texto.deleteText(inicio, fin);
    } else {
      // Primero INSERTAMOS el valor delante del marcador y después borramos
      // el marcador (que quedó corrido valor.length lugares). En ese orden,
      // el texto nunca queda vacío, lo que evita problemas cuando el
      // marcador es todo el contenido de una celda o un párrafo.
      texto.insertText(inicio, valor);
      texto.deleteText(inicio + valor.length, fin + valor.length);
    }
    // Seguimos buscando desde el principio: lo ya reemplazado no coincide más.
    encontrado = seccion.findText(patron);
  }
}

/**
 * Formatea un monto como en Argentina: 1878.3 -> "$ 1.878,30". Lo hacemos
 * a mano para no depender de cómo formatee números el servidor.
 *
 * @param {number} monto
 * @returns {string}
 */
function formatearMonto_(monto) {
  const numero = Number(monto);
  if (!Number.isFinite(numero)) {
    // Mejor fallar que poner "$ 0,00" en una constancia sin avisar.
    throw new Error(`Monto inválido: "${monto}"`);
  }
  // Redondeamos primero: así -0,001 no queda como "-$ 0,00".
  const redondeado = Math.round(numero * 100) / 100;
  const [enteros, decimales] = Math.abs(redondeado).toFixed(2).split(".");
  // Un punto cada 3 cifras, contando desde la derecha.
  const conMiles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${redondeado < 0 ? "-" : ""}$ ${conMiles},${decimales}`;
}

/**
 * Devuelve el ID de la plantilla de constancia. Si no existe (o se borró),
 * la crea en la carpeta de la guía y guarda su ID en PLANTILLA_DOC_ID.
 *
 * @returns {string}
 */
function obtenerPlantillaDeConstancia_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(CONFIG_KEYS.PLANTILLA_DOC_ID);
  if (id) {
    try {
      if (!DriveApp.getFileById(id).isTrashed()) {
        return id;
      }
    } catch (error) {
      // No se pudo abrir (se borró, o no tenemos acceso): creamos otra. Lo
      // dejamos en el log, porque la plantilla personalizada se reemplaza.
      console.warn("No se pudo abrir la plantilla guardada, se crea otra:", error.message);
    }
  }

  const doc = DocumentApp.create("Plantilla - Constancia de cliente");
  const body = doc.getBody();
  // Un documento nuevo ya trae un párrafo vacío: lo usamos para el título
  // (si no, el documento empezaría con una línea en blanco).
  // OJO (comprobado probando): setText de un PÁRRAFO no devuelve el
  // párrafo (devuelve nada), así que NO se puede encadenar
  // .setText(...).setHeading(...): da "Cannot read properties of null".
  // appendParagraph, en cambio, sí devuelve el párrafo y se puede encadenar.
  const titulo = body.getParagraphs()[0];
  titulo.setText("Constancia de cliente");
  titulo.setHeading(DocumentApp.ParagraphHeading.TITLE);
  body
    .appendParagraph("Emitida el {{fecha_emision}}")
    .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  // setHeading(NORMAL): un párrafo nuevo puede "heredar" el estilo del
  // anterior (acá, el subtítulo). Lo dejamos explícito.
  body
    .appendParagraph("Por la presente se deja constancia de que {{nombre}} es cliente registrado/a, con los siguientes datos:")
    .setHeading(DocumentApp.ParagraphHeading.NORMAL);

  // Una tabla con los datos: la primera columna fija, la segunda con marcadores.
  const tabla = body.appendTable([
    ["Número de cliente", "{{id}}"],
    ["Email", "{{email}}"],
    ["Ciudad", "{{ciudad}}"],
    ["Monto", "{{monto}}"],
    ["Fecha de alta", "{{fecha_alta}}"],
  ]);
  for (let i = 0; i < tabla.getNumRows(); i++) {
    tabla
      .getCell(i, 0)
      .setBackgroundColor("#e8f0fe")
      .editAsText()
      .setBold(true);
  }

  body.appendParagraph("");
  body
    .appendParagraph(
      "Esta plantilla la creó la Guía de Apps Script. Cambiale el diseño como quieras: lo que se reemplaza son los textos entre {{ }}.",
    )
    .editAsText()
    .setItalic(true)
    .setForegroundColor("#80868b")
    .setFontSize(9);

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(getGuideFolder_());
  props.setProperty(CONFIG_KEYS.PLANTILLA_DOC_ID, doc.getId());
  return doc.getId();
}

/**
 * Genera un documento a partir de una plantilla: copia la plantilla y
 * reemplaza cada marcador por su valor (en el cuerpo, el encabezado y el
 * pie).
 *
 * @param {string} idPlantilla
 * @param {Object<string, string>} valores  { "{{nombre}}": "Ana", ... }
 * @param {GoogleAppsScript.Drive.Folder} carpeta
 * @param {string} nombre                   Nombre del documento nuevo.
 * @returns {GoogleAppsScript.Drive.File}   El documento generado.
 */
function generarDesdePlantilla_(idPlantilla, valores, carpeta, nombre) {
  const copia = DriveApp.getFileById(idPlantilla).makeCopy(nombre, carpeta);
  const doc = DocumentApp.openById(copia.getId());
  // El encabezado y el pie pueden no existir (null): los salteamos.
  const secciones = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(
    (s) => s !== null,
  );
  for (const [marcador, valor] of Object.entries(valores)) {
    secciones.forEach((seccion) =>
      reemplazarMarcador_(seccion, marcador, String(valor)),
    );
  }
  // IMPORTANTE: guardar antes de convertir a PDF (ver arriba).
  doc.saveAndClose();
  return copia;
}

/**
 * DEMO: la cadena completa para un cliente. Genera su constancia (Doc),
 * la convierte a PDF, guarda los dos en Drive y te manda el PDF por mail
 * (a vos mismo).
 *
 * @param {number} [fila=2]  Fila del cliente en la hoja Clientes.
 */
function demo_constanciaDeCliente(fila = 2) {
  const cliente = clienteParaUi_(clientePorFila_(fila));
  const valores = {
    "{{nombre}}": cliente.nombre,
    "{{id}}": cliente.id,
    "{{email}}": cliente.email,
    "{{ciudad}}": cliente.ciudad,
    // Con "$" adelante: el tipo de valor que puede dar problemas con
    // replaceText (por eso usamos reemplazarMarcador_).
    "{{monto}}": formatearMonto_(cliente.monto),
    "{{fecha_alta}}": cliente.fecha_alta,
    "{{fecha_emision}}": formatearFecha_(new Date(), "dd/MM/yyyy"),
  };
  // Controlamos que no falte el valor de ningún marcador conocido.
  const faltantes = MARCADORES_CONSTANCIA.filter((m) => !(m in valores));
  if (faltantes.length > 0) {
    throw new Error(`Faltan valores para: ${faltantes.join(", ")}`);
  }

  const carpeta = obtenerOCrearSubcarpeta_(getGuideFolder_(), "Constancias");
  const nombre = `Constancia ${cliente.id} - ${cliente.nombre}`;
  const doc = generarDesdePlantilla_(
    obtenerPlantillaDeConstancia_(),
    valores,
    carpeta,
    nombre,
  );
  const pdf = carpeta.createFile(
    doc.getAs(MimeType.PDF).setName(`${nombre}.pdf`),
  );
  console.log("Documento:", doc.getUrl());
  console.log("PDF:", pdf.getUrl());

  // ¿Quedó algún marcador sin reemplazar? (por ejemplo, si alguien agregó
  // uno nuevo a la plantilla y no está en "valores").
  const generado = DocumentApp.openById(doc.getId());
  const textoCompleto = [generado.getBody(), generado.getHeader(), generado.getFooter()]
    .filter((s) => s !== null)
    .map((s) => s.getText())
    .join("\n");
  const sobrantes = textoCompleto.match(/\{\{[^}]+\}\}/g);
  if (sobrantes) {
    console.warn("Marcadores sin reemplazar:", sobrantes.join(", "));
  }

  enviarMailConPlantilla_(
    destinatarioDePrueba_(),
    `Constancia de cliente ${cliente.id} (prueba de la guía)`,
    {
      titulo: "Tu constancia de cliente",
      preencabezado: `Adjuntamos la constancia de ${cliente.nombre}.`,
      saludo: `Hola ${cliente.nombre},`,
      parrafos: ["Te adjuntamos tu constancia de cliente en PDF."],
      filas: [["Número de cliente", cliente.id]],
      boton: { texto: "Ver el documento", url: doc.getUrl() },
      pie: "Mail de prueba de la Guía de Apps Script, mandado a tu propia casilla.",
    },
    [pdf.getBlob()],
  );
  // Un cartel con los links directos, para no tener que buscar nada en Drive.
  const plantilla = DriveApp.getFileById(obtenerPlantillaDeConstancia_());
  avisarSiSePuede_(
    `Constancia generada y mandada a ${destinatarioDePrueba_()}.\n\n` +
      `PDF: ${pdf.getUrl()}\n\n` +
      `Documento: ${doc.getUrl()}\n\n` +
      `Carpeta "Constancias": ${carpeta.getUrl()}\n\n` +
      `Plantilla (cambiale el diseño acá): ${plantilla.getUrl()}`,
    true,
  );
}

/**
 * Lo que llama el menú (sin parámetros): pide el ID del cliente y genera
 * su constancia.
 */
function generarConstanciaDeCliente() {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.prompt(
    "Constancia de cliente",
    "ID del cliente (ej: C00001):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (respuesta.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const id = respuesta.getResponseText().trim().toUpperCase();
  if (!id) {
    return;
  }
  const fila = buscarNumeroDeFila_(
    getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES),
    COL_CLIENTES.id,
    id,
  );
  if (fila === -1) {
    ui.alert(`No existe el cliente "${id}".`);
    return;
  }
  demo_constanciaDeCliente(fila);
}

/**
 * DEMO: armar un documento desde cero con distintos elementos: títulos,
 * texto con formato, listas, tabla, imagen, link y salto de página.
 */
function demo_documentoDesdeCero() {
  const doc = DocumentApp.create(
    `Documento de ejemplo ${formatearFecha_(new Date(), "yyyy-MM-dd HH.mm")}`,
  );
  const body = doc.getBody();

  // El párrafo vacío que trae todo documento nuevo, como título (setText
  // no se puede encadenar: ver obtenerPlantillaDeConstancia_).
  const titulo = body.getParagraphs()[0];
  titulo.setText("Documento generado por código");
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Formato en una PARTE del texto: setBold(inicio, fin, true).
  const parrafo = body
    .appendParagraph("Este párrafo tiene una palabra en negrita y otra en rojo.")
    .setHeading(DocumentApp.ParagraphHeading.NORMAL);
  const texto = parrafo.editAsText();
  const iNegrita = "Este párrafo tiene una palabra en ".length;
  texto.setBold(iNegrita, iNegrita + "negrita".length - 1, true);
  const iRojo = texto.getText().indexOf("rojo");
  texto.setForegroundColor(iRojo, iRojo + "rojo".length - 1, "#d93025");

  body
    .appendParagraph("Una lista:")
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  ["Primer ítem", "Segundo ítem", "Tercer ítem"].forEach((item) =>
    body.appendListItem(item).setGlyphType(DocumentApp.GlyphType.BULLET),
  );

  body
    .appendParagraph("Una tabla:")
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const tabla = body.appendTable([
    ["Producto", "Precio"],
    ["Manzana", "$ 1.200"],
    ["Pera", "$ 1.500"],
  ]);
  tabla.getRow(0).editAsText().setBold(true);

  body
    .appendParagraph("Una imagen:")
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendImage(
    Utilities.newBlob(
      Utilities.base64Decode(ICONO_ARBOL_BASE64),
      MimeType.PNG,
      "arbol.png",
    ),
  );

  body
    .appendParagraph("Un link a la guía")
    .setHeading(DocumentApp.ParagraphHeading.NORMAL)
    .setLinkUrl("https://github.com/JoniDG/guide-appscript");
  body.appendPageBreak();
  body.appendParagraph("Esto ya está en la página 2.").setHeading(DocumentApp.ParagraphHeading.NORMAL);

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(carpetaDeDemos_());
  console.log("Documento creado:", doc.getUrl());
  avisarSiSePuede_(`Documento creado en la carpeta Demos Drive:\n\n${doc.getUrl()}`, true);
}
