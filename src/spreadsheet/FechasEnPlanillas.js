/**
 * ============================================================================
 *  SPREADSHEET 7: FECHAS EN LA PLANILLA (Y LA TRAMPA DE LAS DOS ZONAS)
 * ============================================================================
 *
 *  Hay DOS zonas horarias en juego:
 *    - La del PROYECTO de Apps Script (appsscript.json). La usa el código:
 *      new Date(), getHours(), Utilities.formatDate con
 *      Session.getScriptTimeZone()...
 *    - La de la PLANILLA (Archivo > Configuración > Zona horaria). La usa
 *      Sheets para mostrar las fechas de las celdas y para =HOY() / =AHORA().
 *
 *  Si NO coinciden, pasa esto: el código escribe "hoy a las 00:00" (hora del
 *  proyecto), pero la planilla lo muestra en SU zona, que puede ser "ayer a
 *  las 22:00". Resultado: fechas corridas un día, el error más misterioso
 *  de Apps Script.
 *
 *  La solución: que las dos zonas sean iguales. setup() de esta guía las
 *  iguala automáticamente (setSpreadsheetTimeZone). En tus proyectos,
 *  revisalo siempre al empezar: demo_compararZonasHorarias.
 *
 *  Otros detalles:
 *    - Una celda con fecha devuelve un objeto Date con getValues, y el
 *      texto que se ve con getDisplayValues.
 *    - Para Sheets, una fecha es un NÚMERO con formato de fecha: la cantidad
 *      de días desde el 30/12/1899 (46000 ≈ diciembre de 2025). Si cambiás el
 *      formato de una celda con fecha a "Número", ves ese número.
 *    - Si escribís un TEXTO como "05/03/2026", Sheets intenta adivinar si es
 *      una fecha según la configuración regional: según la región puede
 *      quedar como 5 de marzo, como 3 de mayo, o como texto. Escribí
 *      siempre objetos Date, nunca textos.
 * ============================================================================
 */

/**
 * DEMO: ver si la zona del proyecto y la de la planilla coinciden.
 */
function demo_compararZonasHorarias() {
  const zonaProyecto = Session.getScriptTimeZone();
  const zonaPlanilla = getGuideSpreadsheet_().getSpreadsheetTimeZone();
  console.log("Zona del proyecto:", zonaProyecto);
  console.log("Zona de la planilla:", zonaPlanilla);
  console.log(
    zonaProyecto === zonaPlanilla
      ? "Coinciden: las fechas se ven igual en el código y en la planilla."
      : "¡NO coinciden! Las fechas pueden aparecer corridas. Igualalas con " +
          "spreadsheet.setSpreadsheetTimeZone(Session.getScriptTimeZone()).",
  );
}

/**
 * DEMO: escribir fechas, leerlas como Date y como texto, y ver su número.
 */
function demo_fechasEnCeldas() {
  const hoja = hojaDePruebasLimpia_();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // hoy a medianoche, sin hora

  hoja
    .getRange("A1:C1")
    .setValues([["Fecha (Date)", "Fecha (texto)", "HOY() de la planilla"]]);
  hoja.getRange("A2").setValue(hoy).setNumberFormat("dd/mm/yyyy");
  // Un texto que PARECE fecha: Sheets decide qué hacer con él.
  hoja.getRange("B2").setValue("05/03/2026");
  hoja.getRange("C2").setFormula("=TODAY()").setNumberFormat("dd/mm/yyyy");
  SpreadsheetApp.flush();

  const leida = hoja.getRange("A2").getValue();
  console.log("A2 con getValue:", leida, "| ¿es Date?", leida instanceof Date);
  console.log("A2 con getDisplayValue:", hoja.getRange("A2").getDisplayValue());
  console.log(
    "B2 (era texto):",
    hoja.getRange("B2").getValue(),
    "| ¿Sheets lo convirtió en fecha?",
    hoja.getRange("B2").getValue() instanceof Date,
  );

  // La misma fecha vista como número de serie de Sheets.
  hoja.getRange("A3").setValue(hoy).setNumberFormat("0");
  console.log(
    "A3 (la misma fecha como número):",
    hoja.getRange("A3").getDisplayValue(),
  );

  // ¿El =HOY() de la planilla coincide con el "hoy" del código?
  const hoyDelCodigo = formatearFecha_(hoy, "dd/MM/yyyy");
  console.log(
    `Hoy según el código: ${hoyDelCodigo} | según la planilla: ${hoja.getRange("C2").getDisplayValue()}`,
  );
}
