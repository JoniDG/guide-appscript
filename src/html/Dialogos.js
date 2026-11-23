/**
 * ============================================================================
 *  HTML / UI 3: ABRIR VENTANAS Y MOSTRAR MENSAJES
 * ============================================================================
 *
 *  Todo lo que aparece "encima" de la planilla se pide con
 *  SpreadsheetApp.getUi() (la interfaz de la planilla):
 *
 *    ui.alert(...)                    -> aviso con botón OK, o pregunta Sí/No
 *    ui.prompt(...)                   -> pide un texto
 *    spreadsheet.toast(...)           -> cartelito abajo a la derecha que se
 *                                        va solo (no bloquea nada)
 *    ui.showModalDialog(html, título) -> ventana modal con tu HTML
 *    ui.showModelessDialog(html, t.)  -> ventana NO modal (se puede seguir
 *                                        usando la planilla)
 *    ui.showSidebar(html)             -> barra lateral derecha
 *
 *  getUi() solo funciona cuando hay una persona mirando la planilla: desde
 *  el editor de Apps Script (botón Ejecutar), un menú, un botón o una
 *  ventana. En un trigger por tiempo o en el web app tira error ("Cannot
 *  call SpreadsheetApp.getUi() from this context").
 *
 *  Las funciones de este archivo son públicas (sin "_") porque las
 *  ejecutan el menú (Menu.js) y los botones del Panel (Panel.js).
 *  Si las ejecutás desde el editor, la ventana aparece en la PLANILLA (tené
 *  abierta la pestaña de la planilla para verla).
 * ============================================================================
 */

/** Abre el formulario de alta de cliente (modal). */
function abrirAltaCliente() {
  const html = ventana_("AltaCliente", {
    ciudades: ciudadesDeClientes_(),
    modo: "modal", // la misma vista sirve como modal y como página web
  })
    .setWidth(440)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, "Nuevo cliente");
}

/**
 * Abre el formulario de edición, PRECARGADO con los datos del cliente.
 *   - Si estás parado en una fila de la hoja Clientes, edita esa fila.
 *   - Si no (por ejemplo, tocaste el botón del Panel), pregunta el ID.
 */
function abrirEditarCliente() {
  const ui = SpreadsheetApp.getUi();
  const hojaActiva = SpreadsheetApp.getActiveSheet();
  let fila = -1;

  if (
    hojaActiva.getName() === SHEET_CLIENTES &&
    hojaActiva.getActiveCell().getRow() > 1 &&
    hojaActiva.getActiveCell().getRow() <= hojaActiva.getLastRow() &&
    hojaActiva.getRange(hojaActiva.getActiveCell().getRow(), COL_CLIENTES.id).getValue() !== ""
  ) {
    fila = hojaActiva.getActiveCell().getRow();
  } else {
    const respuesta = ui.prompt(
      "Editar cliente",
      "Escribí el ID del cliente (ej: C00010).\n" +
        "Tip: si te parás en una fila de la hoja Clientes, se edita esa fila directamente.",
      ui.ButtonSet.OK_CANCEL,
    );
    // Si tocó Cancelar o cerró la ventana, no hacemos nada.
    if (respuesta.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    const id = respuesta.getResponseText().trim().toUpperCase();
    fila = buscarNumeroDeFila_(
      getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES),
      COL_CLIENTES.id,
      id,
    );
    if (fila === -1) {
      ui.alert(`No existe el cliente "${id}".`);
      return;
    }
  }

  const html = ventana_("EditarCliente", {
    cliente: clienteParaUi_(clientePorFila_(fila)),
    ciudades: ciudadesDeClientes_(),
  })
    .setWidth(440)
    .setHeight(600);
  ui.showModalDialog(html, "Editar cliente");
}

/** Abre la barra lateral de búsqueda. */
function abrirBuscarCliente() {
  // setTitle: el título de la barra lateral.
  SpreadsheetApp.getUi().showSidebar(
    ventana_("BuscarCliente").setTitle("Buscar cliente"),
  );
}

/** Abre el modal para subir un archivo a Drive. */
function abrirSubirArchivo() {
  const html = ventana_("SubirArchivo", {
    tiposPermitidos: TIPOS_PERMITIDOS_SUBIDA,
    maxMb: MAX_BYTES_SUBIDA / 1024 / 1024,
  })
    .setWidth(440)
    .setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, "Subir archivo a Drive");
}

/**
 * Genera un reporte de clientes por ciudad en la hoja "Reporte".
 * Antes pide confirmación, porque reemplaza el reporte anterior.
 */
function generarReporte() {
  const ui = SpreadsheetApp.getUi();
  const confirmacion = ui.alert(
    "Generar reporte",
    "Se va a reemplazar la hoja Reporte. ¿Continuar?",
    ui.ButtonSet.YES_NO,
  );
  if (confirmacion !== ui.Button.YES) {
    return;
  }

  const spreadsheet = getGuideSpreadsheet_();
  // toast con duración -1: queda visible hasta que mostremos otro.
  spreadsheet.toast("Calculando…", "Reporte", -1);

  const clientes = hojaAObjetos_(spreadsheet.getSheetByName(SHEET_CLIENTES));
  if (clientes.length === 0) {
    spreadsheet.toast("La hoja Clientes está vacía: no hay nada para reportar.", "Reporte", 5);
    return;
  }
  const porCiudad = {};
  for (const c of clientes) {
    if (!porCiudad[c.ciudad]) {
      porCiudad[c.ciudad] = { total: 0, activos: 0, monto: 0 };
    }
    const fila = porCiudad[c.ciudad];
    fila.total++;
    // === true y Number(...): por si alguna celda se cargó a mano con texto
    // ("FALSE", "") en lugar de un booleano o un número. Sin esto, sumar un
    // texto lo "pegaría" en vez de sumarlo ("0" + "5" = "05").
    fila.activos += c.activo === true ? 1 : 0;
    fila.monto += Number(c.monto) || 0;
  }
  const filas = Object.entries(porCiudad)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([ciudad, d]) => [
      ciudad,
      d.total,
      d.activos,
      d.activos / d.total,
      d.monto,
    ]);

  const hoja = recrearHoja_(SHEET_REPORTE);
  const encabezados = [
    "Ciudad",
    "Clientes",
    "Activos",
    "% activos",
    "Monto total",
  ];
  hoja
    .getRange("A1")
    .setValue(
      `Reporte de clientes por ciudad (${formatearFecha_(new Date(), "dd/MM/yyyy HH:mm")})`,
    );
  hoja.getRange("A1").setFontSize(14).setFontWeight("bold");
  hoja
    .getRange(3, 1, 1, encabezados.length)
    .setValues([encabezados])
    .setFontWeight("bold")
    .setBackground("#e8f0fe");
  hoja.getRange(4, 1, filas.length, encabezados.length).setValues(filas);
  hoja.getRange(4, 4, filas.length, 1).setNumberFormat("0.0%");
  hoja.getRange(4, 5, filas.length, 1).setNumberFormat("$ #,##0.00");
  hoja.autoResizeColumns(1, encabezados.length);
  hoja.activate();

  spreadsheet.toast(
    `${clientes.length} clientes en ${filas.length} ciudades.`,
    "Reporte listo",
    5,
  );
}

/** DEMO: un aviso simple con botón OK. */
function demo_alerta() {
  SpreadsheetApp.getUi().alert(
    "Hola",
    "Esto es un aviso de Apps Script.",
    SpreadsheetApp.getUi().ButtonSet.OK,
  );
}

/** DEMO: pregunta Sí / No y actúa según la respuesta. */
function demo_confirmacion() {
  const ui = SpreadsheetApp.getUi();
  // alert devuelve qué botón tocó la persona.
  const boton = ui.alert(
    "Confirmación",
    "¿Te está sirviendo la guía?",
    ui.ButtonSet.YES_NO,
  );
  if (boton === ui.Button.YES) {
    ui.alert("¡Genial!");
  } else if (boton === ui.Button.NO) {
    ui.alert("Contame qué le falta.");
  } else {
    // Button.CLOSE: cerró la ventana con la X.
    getGuideSpreadsheet_().toast("Cerraste la pregunta sin responder.");
  }
}

/** DEMO: pedir un texto y usarlo. */
function demo_pedirDato() {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.prompt(
    "Tu nombre",
    "¿Cómo te llamás?",
    ui.ButtonSet.OK_CANCEL,
  );
  if (
    respuesta.getSelectedButton() === ui.Button.OK &&
    respuesta.getResponseText().trim()
  ) {
    getGuideSpreadsheet_().toast(
      `¡Hola, ${respuesta.getResponseText().trim()}!`,
      "Saludo",
    );
  }
}

/** DEMO: aviso rápido que no bloquea. toast(mensaje, título, segundos). */
function demo_toast() {
  getGuideSpreadsheet_().toast(
    "Esto desaparece solo en 5 segundos.",
    "Aviso",
    5,
  );
}

/**
 * DEMO: diálogo NO modal. Se puede seguir usando la planilla con la
 * ventana abierta. HtmlService.createHtmlOutput permite armar el HTML
 * desde un texto, sin archivo .html.
 */
function demo_dialogoNoModal() {
  const html = HtmlService.createHtmlOutput(
    `<div style="font-family: sans-serif">
       <p>Esta ventana <b>no bloquea</b> la planilla: probá hacer clic en una celda.</p>
       <button onclick="google.script.host.close()">Cerrar</button>
     </div>`,
  )
    .setWidth(320)
    .setHeight(140);
  SpreadsheetApp.getUi().showModelessDialog(html, "Diálogo no modal");
}

/**
 * DEMO: el CSS oficial de Google para complementos. Con solo enlazarlo, los
 * botones y campos se ven como los de Google. Clases de ese CSS:
 *   botones: "action" (azul), "create" (verde), "share" (azul); un botón
 *   sin clase queda gris, el estilo secundario por defecto.
 *   bloques: "block" (separa elementos), "form-group" (agrupa etiqueta y campo).
 *   texto: "secondary" (texto gris chico, para aclaraciones).
 */
function demo_dialogoConCssDeGoogle() {
  const html = HtmlService.createHtmlOutput(
    `<link rel="stylesheet" href="https://ssl.gstatic.com/docs/script/css/add-ons1.css">
     <div class="block form-group">
       <label for="nombre">Nombre</label>
       <input type="text" id="nombre" style="width: 100%">
     </div>
     <div class="block">
       <button class="action">Botón principal</button>
       <button class="create">Crear</button>
       <button onclick="google.script.host.close()">Cerrar</button>
     </div>
     <div class="block secondary">Texto aclaratorio con la clase "secondary".</div>`,
  )
    .setWidth(340)
    .setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, "CSS de Google");
}
