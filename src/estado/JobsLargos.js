/**
 * ============================================================================
 *  ESTADO 4: PROCESOS DE MÁS DE 6 MINUTOS ("JOBS" EN TANDAS)
 * ============================================================================
 *
 *  Una ejecución de Apps Script se corta a los 6 minutos. ¿Cómo se procesa
 *  algo que tarda más (miles de filas, cientos de archivos, una API lenta)?
 *
 *  EL PATRÓN: partir el trabajo en TANDAS y continuar en otra ejecución.
 *    1. Guardar el AVANCE ("procesé hasta la fila 1.500") en las
 *       Propiedades del script, después de CADA tanda.
 *    2. Antes de empezar cada tanda, mirar el reloj: si no queda tiempo
 *       suficiente, cortar ANTES de que Google nos corte (ver
 *       fundamentos/Limites.js: tiempoRestanteMs_).
 *    3. Un trigger de una sola vez ("dentro de 1 minuto") vuelve a llamar
 *       a la misma función, que retoma desde el avance guardado.
 *    4. Cuando termina todo, se marca como terminado y no se programa más.
 *
 *  LOS DETALLES QUE LO HACEN ROBUSTO (y que es fácil olvidar):
 *    - La continuación se programa AL EMPEZAR cada ejecución, no al final.
 *      Si la ejecución falla a la mitad o Google la corta, el trigger ya
 *      está programado y la cadena sigue desde la última tanda guardada.
 *      Si terminó, se borra.
 *    - Un candado para que dos ejecuciones no procesen a la vez. Usamos
 *      getUserLock() y NO getScriptLock(): el job tiene el candado durante
 *      toda su ejecución, y si fuera el de script, bloquearía todo lo demás
 *      que usa ese candado (por ejemplo, las altas de clientes de la API).
 *      Son candados distintos, que no se bloquean entre sí. (Los triggers
 *      y el menú corren como el dueño, así que el candado de usuario
 *      alcanza para que el job no se pise consigo mismo.)
 *    - Iniciar y cancelar también toman el candado: así no pisan el estado
 *      de una ejecución que está en curso.
 *    - Procesar una tanda dos veces no hace daño (escribimos en filas
 *      fijas), mientras la hoja de origen no cambie durante el job.
 *    - Si algo imprescindible falta (la hoja de resultados, la de origen),
 *      el job queda en "error" con el motivo, en vez de colgarse.
 *
 *  EL EJEMPLO: calcula un "segmento" (alto / medio / bajo según el monto)
 *  para los 5.000 clientes, en la hoja "Job de ejemplo". Para que el corte
 *  se vea sin esperar horas, cada tanda "tarda" 3 segundos a propósito y
 *  cada ejecución se da solo 15 segundos (en un caso real serían ~5
 *  minutos). El job necesita varias ejecuciones, separadas por al menos
 *  un minuto (los triggers "after" pueden demorar más), y se completa solo.
 *
 *  Para probar: menú Guía > Estado y jobs > Iniciar job de ejemplo, y mirá
 *  la hoja "Job de ejemplo" (no hace falta tenerla abierta).
 * ============================================================================
 */

/** Configuración del job de ejemplo. */
const JOB_EJEMPLO = {
  clave: "JOB_SEGMENTOS", // dónde se guarda el avance (Propiedades del script)
  funcion: "procesarJobDeEjemplo", // la función que llama el trigger
  tamanioTanda: 500, // filas por tanda
  pausaPorTandaMs: 3000, // simula que cada tanda tarda (solo para la demo)
  presupuestoMs: 15000, // tiempo por ejecución (en la realidad, ~5 min)
  margenMs: 4000, // tiempo de reserva para guardar y terminar prolijo
};

/**
 * @returns {{estado: string, cursor: number, total: number, tandas: number, ejecuciones: number, inicio: string, detalle?: string}|null}
 */
function leerEstadoDelJob_() {
  return leerJson_(
    PropertiesService.getScriptProperties(),
    JOB_EJEMPLO.clave,
    null,
  );
}

/** @param {Object} estado */
function guardarEstadoDelJob_(estado) {
  guardarJson_(
    PropertiesService.getScriptProperties(),
    JOB_EJEMPLO.clave,
    estado,
  );
}

/**
 * Escribe el estado en la hoja del job, para verlo sin entrar al editor.
 * @param {string} texto
 */
function mostrarEstadoDelJob_(texto) {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_JOB);
  if (hoja !== null) {
    hoja
      .getRange("F2")
      .setValue(`${formatearFecha_(new Date(), "HH:mm:ss")} - ${texto}`);
  }
}

/** Programa la próxima ejecución del job (dentro de al menos 1 minuto). */
function programarContinuacionDelJob_() {
  ScriptApp.newTrigger(JOB_EJEMPLO.funcion)
    .timeBased()
    .after(60 * 1000)
    .create();
}

/**
 * Toma el candado del job, esperando lo que puede durar una ejecución.
 * @returns {GoogleAppsScript.Lock.Lock|null}  El candado, o null si no se pudo.
 */
function tomarCandadoDelJob_() {
  const lock = LockService.getUserLock();
  return lock.tryLock(JOB_EJEMPLO.presupuestoMs + JOB_EJEMPLO.margenMs)
    ? lock
    : null;
}

/**
 * Arranca el job desde cero. Si ya había uno, lo reemplaza (esperando a
 * que termine la ejecución que esté en curso).
 */
function iniciarJobDeEjemplo() {
  const total =
    getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES).getLastRow() - 1;
  if (total < 1) {
    avisarSiSePuede_(
      "La hoja Clientes está vacía: no hay nada para procesar.",
      true,
    );
    return;
  }

  const lock = tomarCandadoDelJob_();
  if (lock === null) {
    avisarSiSePuede_(
      "Hay una ejecución del job en curso: probá de nuevo en unos segundos.",
      true,
    );
    return;
  }
  try {
    borrarTriggersDe_([JOB_EJEMPLO.funcion]);
    const hoja = recrearHoja_(SHEET_JOB);
    hoja
      .getRange("A1:D1")
      .setValues([["id", "nombre", "monto", "segmento"]])
      .setFontWeight("bold");
    hoja.getRange("F1").setValue("Estado del job").setFontWeight("bold");
    hoja.setColumnWidth(6, 560);
    guardarEstadoDelJob_({
      estado: "corriendo",
      cursor: 0,
      total,
      tandas: 0,
      ejecuciones: 0,
      inicio: formatearFecha_(new Date(), "dd/MM/yyyy HH:mm:ss"),
    });
    mostrarEstadoDelJob_(
      `Iniciado: ${total} clientes en tandas de ${JOB_EJEMPLO.tamanioTanda}.`,
    );
  } finally {
    lock.releaseLock();
  }
  // La primera ejecución, ahora mismo (vuelve a tomar el candado adentro).
  procesarJobDeEjemplo();
}

/**
 * Procesa tandas hasta quedarse sin tiempo. La llama iniciarJobDeEjemplo
 * (la primera vez) y después el trigger de continuación.
 */
function procesarJobDeEjemplo() {
  const inicio = Date.now();
  const lock = tomarCandadoDelJob_();
  if (lock === null) {
    // Otra ejecución está procesando: ella ya tiene su continuación
    // programada. Por las dudas, dejamos una más (si sobra, la próxima
    // ejecución que consiga el candado la borra).
    const estado = leerEstadoDelJob_();
    if (estado !== null && estado.estado === "corriendo") {
      programarContinuacionDelJob_();
    }
    return;
  }

  try {
    // Dejamos UNA sola continuación pendiente: borramos las que hubiera
    // (incluida la que nos llamó) y programamos la próxima YA, al empezar.
    borrarTriggersDe_([JOB_EJEMPLO.funcion]);
    const estado = leerEstadoDelJob_();
    if (estado === null || estado.estado !== "corriendo") {
      return;
    }
    programarContinuacionDelJob_();
    estado.ejecuciones++;
    guardarEstadoDelJob_(estado);

    const planilla = getGuideSpreadsheet_();
    const hoja = planilla.getSheetByName(SHEET_JOB);
    const origen = planilla.getSheetByName(SHEET_CLIENTES);
    if (hoja === null || origen === null) {
      finalizarJobConError_(
        estado,
        `Falta la hoja "${hoja === null ? SHEET_JOB : SHEET_CLIENTES}".`,
      );
      return;
    }
    // Si la hoja de origen se achicó durante el job, no leemos de más.
    const total = Math.min(estado.total, origen.getLastRow() - 1);

    // ¿Queda tiempo para OTRA tanda? (en la realidad: tiempoRestanteMs_)
    const quedaTiempo = () =>
      Date.now() - inicio + JOB_EJEMPLO.margenMs + JOB_EJEMPLO.pausaPorTandaMs <
      JOB_EJEMPLO.presupuestoMs;

    while (estado.cursor < total && quedaTiempo()) {
      // Leemos SOLO las filas de esta tanda, no las 5.000.
      const cantidad = Math.min(
        JOB_EJEMPLO.tamanioTanda,
        total - estado.cursor,
      );
      const tanda = origen
        .getRange(estado.cursor + 2, 1, cantidad, CLIENTES_HEADERS.length)
        .getValues();
      const filas = tanda.map((c) => {
        const monto = Number(c[COL_CLIENTES.monto - 1]) || 0;
        const segmento =
          monto >= 3500 ? "alto" : monto >= 1500 ? "medio" : "bajo";
        return [
          c[COL_CLIENTES.id - 1],
          c[COL_CLIENTES.nombre - 1],
          monto,
          segmento,
        ];
      });
      Utilities.sleep(JOB_EJEMPLO.pausaPorTandaMs); // simula trabajo lento
      // Cada tanda va a filas FIJAS (cursor + 2): repetirla no duplica nada.
      hoja.getRange(estado.cursor + 2, 1, filas.length, 4).setValues(filas);

      estado.cursor += cantidad;
      estado.tandas++;
      // Guardamos el avance DESPUÉS DE CADA TANDA.
      guardarEstadoDelJob_(estado);
      mostrarEstadoDelJob_(
        `Corriendo: ${estado.cursor}/${total} (tanda ${estado.tandas}, ejecución ${estado.ejecuciones})`,
      );
      SpreadsheetApp.flush();
    }

    if (estado.cursor >= total) {
      estado.estado = "terminado";
      guardarEstadoDelJob_(estado);
      borrarTriggersDe_([JOB_EJEMPLO.funcion]); // ya no hace falta continuar
      mostrarEstadoDelJob_(
        `Terminado: ${estado.cursor} clientes en ${estado.tandas} tandas y ${estado.ejecuciones} ejecuciones ` +
          `(empezó ${estado.inicio}).`,
      );
      return;
    }
    mostrarEstadoDelJob_(
      `Pausado a propósito en ${estado.cursor}/${total} (ejecución ${estado.ejecuciones}): sigue solo en un rato.`,
    );
  } finally {
    lock.releaseLock();
  }
}

/**
 * Deja el job en "error" con el motivo, y sin continuaciones pendientes.
 * @param {Object} estado
 * @param {string} motivo
 */
function finalizarJobConError_(estado, motivo) {
  estado.estado = "error";
  estado.detalle = motivo;
  guardarEstadoDelJob_(estado);
  borrarTriggersDe_([JOB_EJEMPLO.funcion]);
  mostrarEstadoDelJob_(`Error: ${motivo}`);
}

/**
 * Cancela el job. Toma el candado, así no hay una ejecución en curso que
 * después pise el "cancelado".
 */
function cancelarJobDeEjemplo() {
  const lock = tomarCandadoDelJob_();
  if (lock === null) {
    avisarSiSePuede_(
      "Hay una ejecución del job en curso: probá de nuevo en unos segundos.",
      true,
    );
    return;
  }
  try {
    borrarTriggersDe_([JOB_EJEMPLO.funcion]);
    const estado = leerEstadoDelJob_();
    if (estado === null || estado.estado !== "corriendo") {
      avisarSiSePuede_("No hay ningún job corriendo.");
      return;
    }
    estado.estado = "cancelado";
    guardarEstadoDelJob_(estado);
    mostrarEstadoDelJob_(`Cancelado en ${estado.cursor}/${estado.total}.`);
  } finally {
    lock.releaseLock();
  }
}

/** Muestra el estado guardado del job. */
function verEstadoDelJob() {
  const estado = leerEstadoDelJob_();
  const texto =
    estado === null
      ? "Nunca se inició el job."
      : JSON.stringify(estado, null, 2);
  console.log(texto);
  avisarSiSePuede_(texto, true);
}
