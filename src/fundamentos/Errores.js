/**
 * ============================================================================
 *  FUNDAMENTOS 4: MANEJO DE ERRORES
 * ============================================================================
 *
 *  Un "error" (o "excepción") es algo que sale mal mientras el código corre:
 *  una planilla que no existe, una API que no responde, un dato con formato
 *  incorrecto... Cuando pasa, JavaScript "tira" (throw) el error y la
 *  ejecución se corta, salvo que lo "atrapemos" (catch).
 *
 *  ¿Qué pasa con un error que nadie atrapa?
 *    - Desde el editor: aparece en rojo en el Registro de ejecución.
 *    - En un trigger instalable (los que se crean desde el menú Activadores
 *      o por código): la ejecución queda con estado "Error" en el panel
 *      Ejecuciones, y Google te manda un mail con un resumen de los errores
 *      (por defecto, una vez por día; se puede cambiar en el activador).
 *    - En un trigger simple (onOpen, onEdit): falla en silencio. NO llega
 *      ningún mail; solo queda registrado en el panel Ejecuciones.
 *    - En un web app (doGet/doPost): quien hizo el pedido recibe una página
 *      HTML de error de Google en vez de tu respuesta (tema Backend).
 *
 *  Las 3 piezas:
 *    throw  -> "tirar" un error a propósito, cuando algo no es válido.
 *    try    -> "intentá ejecutar este bloque..."
 *    catch  -> "...y si algo tira un error, hacé esto otro".
 *    finally (opcional) -> "y al final, haya error o no, hacé esto".
 *
 *  Error común: DEVOLVER un error (return new Error(...)) en vez de
 *  TIRARLO (throw new Error(...)). Si lo devolvés, el código sigue como si
 *  nada y quien llamó a la función tiene que acordarse de revisar qué
 *  recibió; casi siempre nadie lo revisa y el problema aparece más tarde,
 *  en otro lugar. Mirá demo_tirarVsDevolver.
 * ============================================================================
 */

/**
 * Divide dos números, pero no acepta dividir por cero.
 * Ejemplo de función que TIRA un error cuando recibe algo inválido.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function dividir_(a, b) {
  if (b === 0) {
    // new Error("mensaje") crea el error; throw lo "tira".
    // A partir de acá, esta función no sigue ejecutándose.
    throw new Error("No se puede dividir por cero");
  }
  return a / b;
}

/**
 * DEMO: try / catch / finally.
 */
function demo_tryCatch() {
  try {
    console.log("10 / 2 =", dividir_(10, 2));
    console.log("10 / 0 =", dividir_(10, 0)); // Esto tira error...
    console.log("Esta línea nunca se ejecuta"); // ...así que esto no corre.
  } catch (error) {
    // "error" es el objeto que se tiró. Lo más útil que tiene:
    //   error.message -> el texto que le pusimos.
    //   error.stack   -> en qué archivo y línea pasó (para debuggear).
    console.error("Atrapamos un error:", error.message);
  } finally {
    console.log("finally: esto se ejecuta SIEMPRE, haya error o no.");
  }
  console.log("Como atrapamos el error, la ejecución sigue normalmente.");
}

/**
 * DEMO: por qué conviene TIRAR errores y no DEVOLVERLOS.
 */
function demo_tirarVsDevolver() {
  // Versión mala: devuelve el error como si fuera un resultado normal.
  function buscarPrecioMal(producto) {
    if (producto !== "manzana") {
      return new Error(`No existe el producto ${producto}`);
    }
    return 100;
  }

  // Nadie revisa lo que devolvió, así que el error "se esconde":
  const precio = buscarPrecioMal("pera");
  const total = precio * 3; // Error * 3 = NaN ("Not a Number")
  console.log("Total (versión mala):", total, "<- ¿de dónde salió este NaN?");

  // Versión buena: tira el error. Falla en el lugar exacto del problema,
  // con un mensaje claro.
  function buscarPrecioBien(producto) {
    if (producto !== "manzana") {
      throw new Error(`No existe el producto ${producto}`);
    }
    return 100;
  }

  try {
    const precioBien = buscarPrecioBien("pera");
    console.log("Total (versión buena):", precioBien * 3);
  } catch (error) {
    console.error("Versión buena, error claro:", error.message);
  }
}

/**
 * Ejecuta una función y, si falla, loguea el error con contexto y lo
 * vuelve a tirar.
 *
 * Volver a tirarlo (throw error) es importante: si solo lo logueáramos, la
 * ejecución terminaría como "Completada" aunque haya fallado, y en un
 * trigger instalable Google no nos avisaría por mail.
 *
 * @param {string} nombre   Un nombre para identificar la tarea en el log.
 * @param {Function} tarea  La función a ejecutar.
 * @returns {*}             Lo que devuelva la tarea.
 */
function conLogDeErrores_(nombre, tarea) {
  try {
    return tarea();
  } catch (error) {
    console.error(`Falló "${nombre}": ${error.message}\n${error.stack}`);
    throw error;
  }
}

/**
 * DEMO: usar conLogDeErrores_ para envolver una tarea.
 * Esta demo TERMINA CON ERROR a propósito: así se ve en el panel
 * Ejecuciones una ejecución con estado "Error" y el detalle del error.
 */
function demo_envolverTareaConLog() {
  conLogDeErrores_("dividir por cero", () => dividir_(1, 0));
}

/**
 * DEMO: errores "de Google". Los servicios de Google también tiran errores,
 * y se atrapan igual. Acá pedimos una planilla con un ID inventado.
 */
function demo_erroresDeGoogle() {
  try {
    SpreadsheetApp.openById("ESTE_ID_NO_EXISTE");
  } catch (error) {
    console.error("Error de Google:", error.message);
  }
}
