/**
 * ============================================================================
 *  ESTADO 3: LOCKSERVICE (CANDADOS CONTRA LAS EJECUCIONES SIMULTÁNEAS)
 * ============================================================================
 *
 *  EL PROBLEMA: la "condición de carrera"
 *  Si dos ejecuciones corren AL MISMO TIEMPO (dos pedidos a la API, dos
 *  personas tocando el mismo botón, un trigger y una persona) y las dos
 *  hacen "leer un valor, calcular, escribir", pueden pisarse:
 *
 *      Ejecución A: lee el contador -> 5
 *      Ejecución B: lee el contador -> 5      (A todavía no escribió)
 *      Ejecución A: escribe 5 + 1   -> 6
 *      Ejecución B: escribe 5 + 1   -> 6      ¡se perdió una suma!
 *
 *  Pasa con contadores, IDs correlativos ("el próximo número"), saldos,
 *  stock, "la próxima fila libre" (getLastRow() + 1)...
 *
 *  LA SOLUCIÓN: un candado (lock). Solo UNA ejecución por vez puede estar
 *  dentro de la parte protegida; las demás esperan su turno.
 *
 *    const lock = LockService.getScriptLock();
 *    if (!lock.tryLock(10000)) { ...no conseguí el candado en 10 seg... }
 *    try {
 *      // leer, calcular, escribir: nadie más puede entrar acá
 *    } finally {
 *      lock.releaseLock(); // SIEMPRE liberarlo, aunque haya un error
 *    }
 *
 *  Detalles:
 *    - tryLock(ms) espera hasta ms milisegundos y devuelve true/false.
 *      waitLock(ms) espera lo mismo, pero si no lo consigue TIRA un error.
 *      (El código original de la guía ya usaba tryLock con un aviso de
 *      "recurso ocupado": es la forma más prolija.)
 *    - Si una ejecución termina sin liberar el candado, Google lo libera
 *      solo al terminar la ejecución.
 *    - Tres alcances:
 *        getScriptLock()   -> uno para TODO el proyecto (todos los usuarios)
 *        getUserLock()     -> uno por usuario
 *        getDocumentLock() -> uno por documento
 *    - Proteger SOLO lo justo (leer-calcular-escribir), no toda la función:
 *      mientras alguien tiene el candado, los demás esperan.
 *    - Después de escribir en una planilla dentro del candado, conviene
 *      SpreadsheetApp.flush() antes de liberarlo, para que la próxima
 *      ejecución lea los datos ya escritos.
 *
 *  EL EXPERIMENTO (demo_carreraDeContadores): 10 pedidos SIMULTÁNEOS a la
 *  API publicada (con UrlFetchApp.fetchAll), que suman 1 a dos contadores:
 *  uno sin candado y otro con candado. El de candado termina en 10; el
 *  otro, en menos (cuánto menos varía en cada corrida, según cuántos
 *  pedidos coincidan en el tiempo). Requiere el web app publicado con una
 *  versión que incluya estas rutas (ver backend/Conceptos.js).
 *
 *  Los contadores están en CELDAS de una hoja ("Contadores demo") y no en
 *  las Propiedades: según reportes de la comunidad, dentro de una misma
 *  ejecución Apps Script puede devolver valores de las Propiedades que ya
 *  leyó antes, sin ver lo que escribieron otras ejecuciones. Con una hoja
 *  y SpreadsheetApp.flush() dentro del candado, cada ejecución lee lo que
 *  dejó la anterior.
 * ============================================================================
 */

/**
 * Devuelve el siguiente número de una secuencia (1, 2, 3...) sin repetir,
 * aunque lo pidan varias ejecuciones a la vez. Ideal para números de
 * pedido, de factura, etc.
 *
 * @param {string} nombre  Nombre de la secuencia (ej: "pedidos").
 * @returns {number}
 */
function siguienteNumero_(nombre) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error("El recurso está ocupado, intentá más tarde.");
  }
  try {
    const props = PropertiesService.getScriptProperties();
    const clave = `SECUENCIA_${nombre}`;
    const siguiente = Number(props.getProperty(clave) || 0) + 1;
    props.setProperty(clave, String(siguiente));
    return siguiente;
  } finally {
    lock.releaseLock();
  }
}

/**
 * La hoja con los dos contadores del experimento (A2: sin candado, B2:
 * con candado). La crea si no existe.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function hojaDeContadores_() {
  const planilla = getGuideSpreadsheet_();
  ensureSheet_(planilla, SHEET_CONTADORES, ["sin candado", "con candado"]);
  return planilla.getSheetByName(SHEET_CONTADORES);
}

/**
 * Suma 1 a un contador guardado en una celda, con una pausa a propósito
 * entre leer y escribir (para que la "carrera" se note).
 *
 * @param {string} celda  "A2" o "B2".
 * @returns {number}      El valor nuevo.
 */
function sumarUnoLento_(celda) {
  const rango = hojaDeContadores_().getRange(celda);
  const actual = Number(rango.getValue()) || 0;
  Utilities.sleep(500); // simula un cálculo que tarda
  rango.setValue(actual + 1);
  // flush: que la escritura llegue a la planilla YA, antes de soltar el
  // candado, así la próxima ejecución lee el valor nuevo.
  SpreadsheetApp.flush();
  return actual + 1;
}

/** POST /demo/contador-inseguro (requiere token): suma SIN candado. */
function contadorInseguro_() {
  return { status: 200, data: { valor: sumarUnoLento_("A2") } };
}

/** POST /demo/contador-seguro (requiere token): suma CON candado. */
function contadorSeguro_() {
  const lock = LockService.getScriptLock();
  // 30 segundos: con 10 pedidos de algo más de medio segundo cada uno, el
  // último espera unos 6-8 segundos su turno.
  if (!lock.tryLock(30000)) {
    throw new HttpError_(503, "El recurso está ocupado, intentá más tarde.");
  }
  try {
    return { status: 200, data: { valor: sumarUnoLento_("B2") } };
  } finally {
    lock.releaseLock();
  }
}

/** GET /demo/contadores (pública: son solo dos números de prueba). */
function verContadores_() {
  const [inseguro, seguro] = hojaDeContadores_().getRange("A2:B2").getValues()[0];
  return { status: 200, data: { inseguro: Number(inseguro) || 0, seguro: Number(seguro) || 0 } };
}

/**
 * DEMO: el experimento de la condición de carrera, con pedidos REALMENTE
 * simultáneos a la API publicada.
 */
function demo_carreraDeContadores() {
  const base = getConfig_(CONFIG_KEYS.WEBAPP_URL).replace(/\/+$/, "");
  const token = getConfig_(CONFIG_KEYS.API_TOKEN);
  // Ponemos los dos contadores en 0 y forzamos la escritura.
  hojaDeContadores_().getRange("A2:B2").setValues([[0, 0]]);
  SpreadsheetApp.flush();

  const cantidad = 10;
  const pedido = (ruta) => ({
    url: construirUrl_(base, { ruta }),
    method: "post",
    contentType: "text/plain",
    payload: JSON.stringify({ token }),
    muteHttpExceptions: true,
  });

  for (const ruta of ["demo/contador-inseguro", "demo/contador-seguro"]) {
    const inicio = Date.now();
    // fetchAll: los 10 pedidos salen A LA VEZ (ver requests/ParaleloYReintentos.js).
    const respuestas = UrlFetchApp.fetchAll(
      Array.from({ length: cantidad }, () => pedido(ruta)),
    );
    const errores = respuestas.filter((r) => {
      try {
        return !JSON.parse(r.getContentText()).ok;
      } catch (error) {
        return true; // no era JSON: Google devolvió una página de error
      }
    }).length;
    console.log(
      `${ruta}: ${cantidad} pedidos en ${Date.now() - inicio} ms (${errores} con error)`,
    );
  }

  // Leemos el resultado con OTRO pedido (otra ejecución), por la misma
  // precaución: que esta ejecución no nos devuelva lo que ya leyó o
  // escribió antes (los ceros del principio).
  const resultado = pedirJson_(construirUrl_(base, { ruta: "demo/contadores" }));
  if (!resultado.ok || !resultado.body.ok) {
    throw new Error(`No se pudieron leer los contadores: ${JSON.stringify(resultado.body).slice(0, 200)}`);
  }
  const { inseguro, seguro } = resultado.body.data;
  console.log(`Resultado SIN candado: ${inseguro} (debería ser ${cantidad})`);
  console.log(`Resultado CON candado: ${seguro} (debería ser ${cantidad})`);
}

/**
 * DEMO: una secuencia de números sin repetidos.
 */
function demo_secuencia() {
  const numeros = [
    siguienteNumero_("demo"),
    siguienteNumero_("demo"),
    siguienteNumero_("demo"),
  ];
  console.log(
    "Tres números seguidos de la secuencia 'demo':",
    numeros.join(", "),
  );
}
