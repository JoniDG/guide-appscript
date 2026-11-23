/**
 * ============================================================================
 *  TRIGGERS 3: TRIGGERS INSTALABLES (POR CÓDIGO)
 * ============================================================================
 *
 *  Se crean con ScriptApp.newTrigger("nombreDeLaFuncion") + el tipo:
 *
 *    De la planilla:
 *      .forSpreadsheet(planilla).onEdit()        al editar (con permisos completos)
 *      .forSpreadsheet(planilla).onChange()      al cambiar la ESTRUCTURA
 *      .forSpreadsheet(planilla).onOpen()        al abrir
 *      .forSpreadsheet(planilla).onFormSubmit()  al llegar una respuesta (Formulario.js)
 *    Por tiempo:
 *      .timeBased().everyMinutes(5)              cada 1, 5, 10, 15 o 30 minutos
 *      .timeBased().everyHours(2)                cada 1, 2, 4, 6, 8 o 12 horas
 *      .timeBased().atHour(8).everyDays(1)       todos los días, entre las 8 y las 9
 *      .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9)   los lunes
 *      .timeBased().after(60 * 1000)             UNA vez, dentro de AL MENOS 1
 *                                                minuto (a veces varios más)
 *      .timeBased().at(fecha)                    UNA vez, en esa fecha
 *    y al final .create().
 *
 *  LA TRAMPA DE LOS DUPLICADOS: cada vez que se ejecuta newTrigger(...)
 *  .create() se crea un trigger NUEVO, aunque ya exista uno igual. Si
 *  corrés el instalador dos veces, cada evento ejecuta la función dos
 *  veces. Por eso, ANTES de crear, siempre se borran los anteriores de esa
 *  función (como ya hacía el código original de la guía).
 *
 *  Los triggers corren "como" quien los instaló, con sus permisos. Se ven
 *  (y se pueden borrar a mano) en el editor: ícono del reloj "Activadores".
 *
 *  Para probar: menú Guía > Triggers > Instalar triggers de la guía. Y
 *  cuando termines, Desinstalar: el de cada 5 minutos gasta cuota diaria.
 * ============================================================================
 */

/** Las funciones que instala instalarTriggersDeLaGuia. */
const FUNCIONES_DE_TRIGGERS_DE_LA_GUIA = [
  "alEditarTareaInstalable",
  "alCambiarEstructura",
  "cadaCincoMinutos",
  "resumenDiario",
];

/**
 * Borra todos los triggers del proyecto que llaman a alguna de esas
 * funciones.
 *
 * @param {string[]} funciones
 * @returns {number}  Cuántos borró.
 */
function borrarTriggersDe_(funciones) {
  let borrados = 0;
  // getProjectTriggers: los triggers de ESTE proyecto que instaló el
  // usuario que ejecuta (los de otros usuarios no se ven).
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (funciones.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
      borrados++;
    }
  }
  return borrados;
}

/**
 * Instala los triggers de ejemplo (borrando antes los que hubiera, así se
 * puede ejecutar varias veces sin duplicar).
 */
function instalarTriggersDeLaGuia() {
  const planilla = getGuideSpreadsheet_();
  const borrados = borrarTriggersDe_(FUNCIONES_DE_TRIGGERS_DE_LA_GUIA);

  ScriptApp.newTrigger("alEditarTareaInstalable")
    .forSpreadsheet(planilla)
    .onEdit()
    .create();
  ScriptApp.newTrigger("alCambiarEstructura")
    .forSpreadsheet(planilla)
    .onChange()
    .create();
  ScriptApp.newTrigger("cadaCincoMinutos").timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger("resumenDiario")
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  const mensaje = `Instalados 4 triggers (borrados antes: ${borrados}). Mirá la hoja "${SHEET_REGISTRO_TRIGGERS}".`;
  registrar_("instalarTriggersDeLaGuia", mensaje);
  avisarSiSePuede_(mensaje);
}

/** Desinstala los triggers de ejemplo. */
function desinstalarTriggersDeLaGuia() {
  const borrados = borrarTriggersDe_([
    ...FUNCIONES_DE_TRIGGERS_DE_LA_GUIA,
    "tareaProgramada",
    "alEnviarFormulario",
    // Del código original de la guía (FunctionAutomatic.js, ya migrado): si
    // alguna vez se instaló, ahora fallaría cada minuto porque la función
    // ya no existe. Lo limpiamos también.
    "automaticFunction",
  ]);
  const mensaje = `Desinstalados ${borrados} triggers.`;
  registrar_("desinstalarTriggersDeLaGuia", mensaje);
  avisarSiSePuede_(mensaje);
}

/** Muestra los triggers instalados del proyecto. */
function verTriggersInstalados() {
  const triggers = ScriptApp.getProjectTriggers();
  const lineas = triggers.map(
    (t) =>
      `• ${t.getHandlerFunction()}  (${t.getEventType()}, desde ${t.getTriggerSource()})`,
  );
  const texto =
    lineas.length > 0 ? lineas.join("\n") : "No hay triggers instalados.";
  console.log(texto);
  avisarSiSePuede_(texto, true);
}

/**
 * Muestra un mensaje en la planilla si hay alguien mirando (menú, botón,
 * editor). Si no hay nadie mirando (por ejemplo, desde un trigger por
 * tiempo), getUi() tira error y el toast simplemente no se ve: en esos
 * casos alcanza con el log y la hoja Registro.
 *
 * @param {string} mensaje
 * @param {boolean} [comoAlerta]  true: ventana con OK; false: toast.
 */
function avisarSiSePuede_(mensaje, comoAlerta = false) {
  try {
    if (comoAlerta) {
      SpreadsheetApp.getUi().alert(mensaje);
    } else {
      getGuideSpreadsheet_().toast(mensaje, "Triggers", 5);
    }
  } catch (error) {
    console.log(mensaje);
  }
}

/**
 * TRIGGER INSTALABLE al editar. A diferencia del onEdit simple, este SÍ
 * puede usar Drive: cuando una tarea se marca como hecha, crea una nota en
 * la carpeta "Demos Drive".
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 */
function alEditarTareaInstalable(e) {
  const hoja = e.range.getSheet();
  if (
    hoja.getName() !== SHEET_TAREAS ||
    e.range.getColumn() !== COL_TAREAS.hecho ||
    e.range.getRow() < 2 ||
    e.value !== "TRUE"
  ) {
    return;
  }
  const tarea = hoja.getRange(e.range.getRow(), COL_TAREAS.tarea).getValue();
  const nota = carpetaDeDemos_().createFile(
    `Tarea completada - ${tarea}.txt`,
    `La tarea "${tarea}" se completó el ${formatearFecha_(new Date(), "dd/MM/yyyy HH:mm")}.`,
    MimeType.PLAIN_TEXT,
  );
  registrar_(
    "alEditarTareaInstalable",
    `Nota creada en Drive: ${nota.getUrl()}`,
  );
}

/**
 * TRIGGER INSTALABLE al cambiar la ESTRUCTURA de la planilla: agregar o
 * borrar filas, columnas u hojas, cambiar formato... (onEdit no se entera
 * de esas cosas). e.changeType dice qué pasó:
 *   EDIT, INSERT_ROW, INSERT_COLUMN, REMOVE_ROW, REMOVE_COLUMN,
 *   INSERT_GRID (hoja nueva), REMOVE_GRID (hoja borrada), FORMAT, OTHER.
 * Ojo:
 *   - No dice DÓNDE fue el cambio (no trae e.range).
 *   - La documentación oficial solo lista los nombres, sin explicar cada
 *     uno. OTHER es un "cajón de sastre": según la comunidad, llega al
 *     renombrar una hoja, insertar gráficos o imágenes, tocar notas o
 *     comentarios, e incluso cuando se recalculan fórmulas como
 *     IMPORTRANGE aunque ningún valor cambie. Y no hay forma de saber qué
 *     acción concreta lo provocó.
 *   - Una sola acción puede disparar VARIOS eventos: al insertar una fila
 *     llegan INSERT_ROW y además OTHER (comprobado probando).
 *  Conclusión práctica: reaccioná solo a los tipos concretos que te
 *  interesan (INSERT_ROW, REMOVE_GRID...) y, antes de hacer algo costoso,
 *  verificá el estado real de la hoja: no te bases en OTHER.
 *
 * @param {GoogleAppsScript.Events.SheetsOnChange} e
 */
function alCambiarEstructura(e) {
  // Las ediciones de valores ya las cubre onEdit: registramos el resto.
  if (e.changeType === "EDIT") {
    return;
  }
  registrar_("alCambiarEstructura", `Cambio de estructura: ${e.changeType}`);
}

/**
 * TRIGGER POR TIEMPO, cada 5 minutos. Solo deja una línea en el registro,
 * para ver que corre solo, aunque la planilla esté cerrada.
 *
 * @param {GoogleAppsScript.Events.TimeDriven} e  Trae la fecha y hora de
 *   la ejecución y el triggerUid.
 */
function cadaCincoMinutos(e) {
  registrar_(
    "cadaCincoMinutos",
    `Ejecutado solo (trigger ${e && e.triggerUid})`,
  );
}

/**
 * TRIGGER POR TIEMPO, todos los días entre las 8 y las 9: un resumen de
 * las tareas pendientes. (En el tema Docs y Mail, esto mismo se podría
 * mandar por mail.)
 */
function resumenDiario() {
  const tareas = hojaAObjetos_(
    getGuideSpreadsheet_().getSheetByName(SHEET_TAREAS),
  );
  const pendientes = tareas.filter((t) => t.tarea && t.estado !== "Hecha");
  registrar_(
    "resumenDiario",
    `${pendientes.length} tareas sin terminar: ${pendientes.map((t) => t.tarea).join(" | ")}`,
  );
}

/**
 * DEMO: programar una tarea para que corra UNA vez, dentro de 1 minuto.
 * La función programada borra su propio trigger al terminar (los triggers
 * de una sola vez quedan "gastados" en la lista si no se borran).
 */
function demo_programarEnUnMinuto() {
  borrarTriggersDe_(["tareaProgramada"]);
  ScriptApp.newTrigger("tareaProgramada")
    .timeBased()
    .after(60 * 1000)
    .create();
  const mensaje =
    "Programado: en ~1 minuto aparece una línea en el Registro de triggers.";
  registrar_("demo_programarEnUnMinuto", mensaje);
  avisarSiSePuede_(mensaje);
}

/**
 * Lo que corre "dentro de 1 minuto". Se borra a sí mismo usando
 * e.triggerUid (el ID del trigger que la disparó).
 *
 * @param {GoogleAppsScript.Events.TimeDriven} e
 */
function tareaProgramada(e) {
  try {
    registrar_("tareaProgramada", "¡Ejecutada sola, un minuto (o un poco más) después de programarla!");
  } finally {
    // En el finally: aunque registrar_ falle, el trigger se borra igual.
    // Si se ejecuta a mano desde el editor no hay "e": no hay qué borrar.
    if (e && e.triggerUid) {
      for (const trigger of ScriptApp.getProjectTriggers()) {
        if (trigger.getUniqueId() === e.triggerUid) {
          ScriptApp.deleteTrigger(trigger);
        }
      }
    }
  }
}
