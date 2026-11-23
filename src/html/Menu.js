/**
 * ============================================================================
 *  HTML / UI 2: EL MENÚ PERSONALIZADO DE LA PLANILLA
 * ============================================================================
 *
 *  onOpen es un "trigger simple": Google lo ejecuta SOLO cada vez que
 *  alguien con permiso de edición abre la planilla (no hay que
 *  configurarlo; quien solo puede ver la planilla no ve el menú). Lo usamos para
 *  agregar un menú "Guía" en la barra de menús, al lado de "Ayuda".
 *
 *  Cada opción del menú ejecuta una función por su NOMBRE (un texto). Esa
 *  función tiene que ser pública (no terminar en "_").
 *
 *  Como onOpen es un trigger simple, corre con permisos limitados: crear un
 *  menú está permitido, pero no podría, por ejemplo, mandar un mail.
 *
 *  Si cambiás el menú, recargá la planilla (F5) para verlo.
 *
 *  OJO: solo puede haber UNA función onOpen en todo el proyecto. Si hubiera
 *  dos (en archivos distintos), gana la última que se carga, sin aviso.
 * ============================================================================
 */

/**
 * Se ejecuta automáticamente al abrir la planilla.
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e
 */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Guía")
    // Submenú: createMenu de nuevo, y se agrega con addSubMenu.
    .addSubMenu(
      ui
        .createMenu("Clientes")
        .addItem("Nuevo cliente…", "abrirAltaCliente")
        .addItem("Editar cliente…", "abrirEditarCliente")
        .addItem("Buscar cliente (panel lateral)", "abrirBuscarCliente"),
    )
    .addItem("Subir archivo a Drive…", "abrirSubirArchivo")
    .addItem("Generar reporte rápido", "generarReporte")
    .addSubMenu(
      ui
        .createMenu("Triggers")
        .addItem("Instalar triggers de la guía", "instalarTriggersDeLaGuia")
        .addItem("Desinstalar triggers de la guía", "desinstalarTriggersDeLaGuia")
        .addItem("Ver triggers instalados", "verTriggersInstalados")
        .addItem("Programar una tarea en 1 minuto", "demo_programarEnUnMinuto")
        .addSeparator()
        .addItem("Crear formulario de alta (+ trigger)", "demo_crearFormularioDeAlta")
        .addItem("Borrar formulario de alta", "demo_borrarFormularioDeAlta"),
    )
    .addSubMenu(
      ui
        .createMenu("Estado y jobs")
        .addItem("Iniciar job de ejemplo (5.000 clientes en tandas)", "iniciarJobDeEjemplo")
        .addItem("Ver estado del job", "verEstadoDelJob")
        .addItem("Cancelar job", "cancelarJobDeEjemplo"),
    )
    .addSubMenu(
      ui
        .createMenu("Docs y Mail")
        .addItem("Mandarme el mail de bienvenida (prueba)", "demo_mailDeBienvenida")
        .addItem("Generar constancia de un cliente (Doc + PDF + mail)…", "generarConstanciaDeCliente")
        .addItem("Crear un documento de ejemplo desde cero", "demo_documentoDesdeCero"),
    )
    // addSeparator: una línea divisoria en el menú.
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu("Ejemplos de mensajes")
        .addItem("Alerta", "demo_alerta")
        .addItem("Confirmación (Sí / No)", "demo_confirmacion")
        .addItem("Pedir un dato", "demo_pedirDato")
        .addItem("Aviso rápido (toast)", "demo_toast")
        .addItem("Diálogo NO modal", "demo_dialogoNoModal")
        .addItem("Diálogo con el CSS de Google", "demo_dialogoConCssDeGoogle"),
    )
    .addSeparator()
    .addItem("Ir al Panel", "irAlPanel")
    .addItem("Ejecutar setup()", "setup")
    .addToUi();
}

/** Activa la hoja "Panel" (la de los botones). */
function irAlPanel() {
  const panel = getGuideSpreadsheet_().getSheetByName(SHEET_PANEL);
  if (panel === null) {
    SpreadsheetApp.getUi().alert("Todavía no existe la hoja Panel: ejecutá setup() primero (menú Guía).");
    return;
  }
  panel.activate();
}
