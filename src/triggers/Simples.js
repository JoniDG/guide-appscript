/**
 * ============================================================================
 *  TRIGGERS 2: TRIGGERS SIMPLES (onEdit Y onSelectionChange)
 * ============================================================================
 *
 *  Ejemplos sobre la hoja "Tareas" (la crea setup()):
 *
 *  | tarea | estado | responsable | hecho | actualizado |
 *
 *    - Al editar cualquier dato de una tarea, la columna "actualizado" se
 *      completa sola con la fecha y hora.
 *    - La casilla "hecho" y el estado se mantienen sincronizados: marcar la
 *      casilla pone el estado en "Hecha", y viceversa.
 *    - Al marcar "hecho", el trigger simple INTENTA crear una nota en Drive,
 *      y falla a propósito: los simples no tienen permiso para eso. El
 *      error queda en la hoja "Registro de triggers". El trigger
 *      INSTALABLE (Instalables.js) sí lo logra.
 *
 *  Y en la hoja "Panel":
 *    - Una CASILLA que funciona como botón: al marcarla se genera el
 *      reporte y se desmarca sola. A diferencia de los botones-imagen, las
 *      casillas SÍ funcionan en la app de Sheets del celular.
 *
 *  Para probar: no hay que ejecutar nada. Editá las hojas a mano.
 * ============================================================================
 */

/** Columnas de la hoja Tareas (empezando en 1). */
const COL_TAREAS = {
  tarea: 1,
  estado: 2,
  responsable: 3,
  hecho: 4,
  actualizado: 5,
};

/** Celda del Panel que funciona como "botón" casilla. */
const CELDA_CASILLA_REPORTE = "B17";

/**
 * EL único onEdit del proyecto. Se ejecuta con CADA edición a mano en
 * CUALQUIER hoja, así que lo primero es ver en qué hoja fue y salir rápido
 * si no nos interesa (cada edición de la planilla paga este costo).
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function onEdit(e) {
  const hoja = e.range.getSheet().getName();
  if (hoja === SHEET_TAREAS) {
    alEditarTareas_(e);
  } else if (hoja === SHEET_PANEL) {
    alEditarPanel_(e);
  }
}

/**
 * Lógica de la hoja Tareas.
 *
 * Ojo con un detalle de las reglas de onEdit: si elegís "Hecha" en el
 * desplegable de estado, este código marca la casilla "hecho"... pero ese
 * cambio lo hizo un SCRIPT, así que no dispara ningún onEdit (ni este ni el
 * instalable). Por eso la nota en Drive del trigger instalable solo se crea
 * cuando la PERSONA marca la casilla.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function alEditarTareas_(e) {
  const hoja = e.range.getSheet();

  // Solo nos interesan ediciones dentro de la tabla (columnas A a D: tarea,
  // estado, responsable, hecho). Si se editó más a la derecha, salimos.
  if (e.range.getColumn() > COL_TAREAS.hecho) {
    return;
  }
  // Filas editadas, sin el encabezado y sin pasarnos de la última fila con
  // datos (si alguien borra una columna ENTERA, e.range tiene ~1000 filas).
  const desde = Math.max(2, e.range.getRow());
  const hasta = Math.min(e.range.getLastRow(), hoja.getLastRow());
  if (hasta < desde) {
    return;
  }
  const filas = hasta - desde + 1;

  // 1) Fecha de "actualizado" para las filas editadas que tienen una tarea
  //    (y la borramos en las que quedaron sin tarea). Un solo setValues.
  const ahora = new Date();
  const tareas = hoja.getRange(desde, COL_TAREAS.tarea, filas, 1).getValues();
  hoja
    .getRange(desde, COL_TAREAS.actualizado, filas, 1)
    .setValues(tareas.map(([tarea]) => [tarea === "" ? "" : ahora]))
    .setNumberFormat("dd/mm/yyyy hh:mm");

  // Lo que sigue solo tiene sentido si se editó UNA sola celda.
  if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1 || e.range.getRow() < 2) {
    return;
  }
  const fila = e.range.getRow();
  const columna = e.range.getColumn();

  // 2) Sincronizar la casilla "hecho" con el estado. e.value de una casilla
  //    llega como TEXTO: "TRUE" o "FALSE".
  if (columna === COL_TAREAS.hecho) {
    const hecha = e.value === "TRUE";
    hoja.getRange(fila, COL_TAREAS.estado).setValue(hecha ? "Hecha" : "Pendiente");
    if (hecha) {
      intentarCrearNotaEnDrive_(hoja.getRange(fila, COL_TAREAS.tarea).getValue());
    }
  } else if (columna === COL_TAREAS.estado) {
    hoja.getRange(fila, COL_TAREAS.hecho).setValue(e.value === "Hecha");
  }

  // 3) Si la tarea no tiene responsable, completarlo con quien editó. No lo
  //    hacemos si lo que se editó ES el responsable (si alguien lo vació a
  //    propósito, no lo volvemos a llenar). e.user muchas veces llega vacío
  //    por privacidad: en ese caso no hacemos nada.
  const email = e.user ? e.user.getEmail() : "";
  const responsable = hoja.getRange(fila, COL_TAREAS.responsable);
  if (columna !== COL_TAREAS.responsable && email && tareas[fila - desde][0] !== "" && responsable.getValue() === "") {
    responsable.setValue(email);
  }
}

/**
 * Intenta crear una nota en Drive DESDE UN TRIGGER SIMPLE. Va a fallar
 * (los simples no pueden usar Drive) y lo dejamos registrado, para ver
 * el error real. El mensaje que da Google (comprobado probando) es:
 *   "Los permisos especificados no son suficientes para llamar a
 *    DriveApp.getRootFolder. Permisos necesarios:
 *    (https://www.googleapis.com/auth/drive.readonly ||
 *     https://www.googleapis.com/auth/drive)"
 * O sea: el trigger simple no tiene el permiso de Drive, aunque vos sí se
 * lo hayas dado al proyecto. Un trigger instalable sí lo tiene.
 *
 * @param {string} tarea
 */
function intentarCrearNotaEnDrive_(tarea) {
  try {
    DriveApp.getRootFolder();
    registrar_(
      "onEdit (simple)",
      `Inesperado: pude usar Drive para "${tarea}"`,
    );
  } catch (error) {
    registrar_(
      "onEdit (simple)",
      `No pude usar Drive (es un trigger simple): ${error.message}`,
    );
  }
}

/**
 * Lógica de la hoja Panel: la casilla que genera el reporte.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function alEditarPanel_(e) {
  if (e.range.getA1Notation() !== CELDA_CASILLA_REPORTE || e.value !== "TRUE") {
    return;
  }
  const casilla = e.range;
  const estado = casilla.offset(0, 1); // la celda de al lado (columna C)
  estado.setValue("Generando reporte…");
  // Forzamos a que se vea el mensaje ANTES de hacer el trabajo pesado.
  SpreadsheetApp.flush();
  try {
    if (!armarReporte_()) {
      estado.setValue("No se generó: la hoja Clientes está vacía.");
      return;
    }
    estado.setValue(
      `Reporte generado el ${formatearFecha_(new Date(), "dd/MM/yyyy HH:mm")}. Marcá de nuevo para regenerarlo.`,
    );
  } catch (error) {
    estado.setValue(`Error: ${error.message}`);
  } finally {
    // La casilla se desmarca sola, como un botón que "vuelve".
    casilla.setValue(false);
  }
}

/**
 * Se ejecuta al seleccionar otra celda. Muestra, en la hoja Tareas, qué
 * celda está seleccionada.
 *
 * OJO: se dispara MUCHÍSIMO (cada clic, cada flecha del teclado), así que
 * tiene que ser rapidísimo y salir enseguida si no corresponde. Además, la
 * primera vez que se agrega al proyecto, hay que recargar la planilla para
 * que empiece a funcionar. Y cada escritura queda en el historial de
 * versiones de la planilla: en un proyecto real, conviene que haga algo
 * que no escriba en la hoja, o que escriba solo si el valor cambió.
 *
 * @param {{range: GoogleAppsScript.Spreadsheet.Range}} e
 */
function onSelectionChange(e) {
  const hoja = e.range.getSheet();
  if (hoja.getName() !== SHEET_TAREAS) {
    return;
  }
  hoja.getRange("G2").setValue(`Seleccionaste: ${e.range.getA1Notation()}`);
}

/**
 * Prepara la hoja Tareas con algunas tareas de ejemplo, un desplegable de
 * estado y casillas. Solo si está vacía. La llama setup().
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 */
function prepararHojaDeTareas_(hoja) {
  if (hoja.getLastRow() > 1) {
    return;
  }
  const tareas = [
    ["Llamar a los clientes inactivos", "Pendiente", "", false, ""],
    ["Actualizar la lista de precios", "En curso", "", false, ""],
    ["Mandar el reporte mensual", "Pendiente", "", false, ""],
    ["Revisar las altas de la semana", "Hecha", "", true, ""],
  ];
  hoja.getRange(2, 1, tareas.length, tareas[0].length).setValues(tareas);

  // Desplegable de estado y casillas para TODA la columna (hasta la fila
  // 100), así las tareas nuevas también los tienen.
  const estados = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pendiente", "En curso", "Hecha"], true)
    .build();
  hoja.getRange(2, COL_TAREAS.estado, 99, 1).setDataValidation(estados);
  hoja.getRange(2, COL_TAREAS.hecho, 99, 1).insertCheckboxes();

  hoja.setColumnWidth(COL_TAREAS.tarea, 260);
  hoja.setColumnWidth(COL_TAREAS.responsable, 200);
  hoja.setColumnWidth(COL_TAREAS.actualizado, 140);
  hoja.getRange("G1").setValue("onSelectionChange:").setFontWeight("bold");
}
