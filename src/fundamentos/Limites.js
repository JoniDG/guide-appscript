/**
 * ============================================================================
 *  FUNDAMENTOS 2: LÍMITES Y CUOTAS (QUOTAS)
 * ============================================================================
 *
 *  Apps Script es gratis, pero Google pone topes para que nadie abuse de sus
 *  servidores. Conocerlos evita sorpresas: cuando pasás un límite, la
 *  ejecución se corta con un error (por ejemplo: "Exceeded maximum execution
 *  time" o "Service invoked too many times").
 *
 *  Hay dos tipos de límites:
 *    - Por EJECUCIÓN: cuánto puede durar o pesar UNA ejecución.
 *    - Por DÍA: cuántas veces podés usar un servicio en 24 horas. Se
 *      renuevan cada 24 horas, pero Google no garantiza a qué hora exacta.
 *
 *  Los valores dependen del tipo de cuenta: personal (@gmail.com) o de
 *  empresa (Google Workspace). Los más importantes:
 *
 *  | Límite                                   | Gmail personal | Workspace |
 *  |------------------------------------------|----------------|-----------|
 *  | Duración de una ejecución                | 6 min          | 6 min     |
 *  | Duración de una función personalizada    | 30 seg         | 30 seg    |
 *  |   (las que se usan en una celda: =FN())  |                |           |
 *  | Ejecuciones simultáneas por usuario      | 30             | 30        |
 *  | Tiempo total de triggers por día         | 90 min         | 6 horas   |
 *  | Triggers por usuario por proyecto        | 20             | 20        |
 *  | Destinatarios de mail por día            | 100            | 1.500     |
 *  | Llamadas a URLs externas (UrlFetch)/día  | 20.000         | 100.000   |
 *  | Tamaño de una respuesta de UrlFetch      | 50 MB          | 50 MB     |
 *  | Planillas creadas por día                | 3.200          | 3.200     |
 *  | Documentos creados por día               | 250            | 1.500     |
 *  | Valor guardado en Propiedades            | 9 KB c/u       | 9 KB c/u  |
 *  | Total por almacén de Propiedades         | 500 KB         | 500 KB    |
 *  | Valor guardado en Cache                  | 100 KB c/u     | 100 KB c/u|
 *  | Tiempo máximo en Cache                   | 6 horas        | 6 horas   |
 *  | Utilities.sleep (pausa)                  | 5 min máx      | 5 min máx |
 *
 *  Google puede cambiar estos números. La tabla oficial y actualizada está en:
 *  https://developers.google.com/apps-script/guides/services/quotas
 *
 *  ¿Cómo se trabaja dentro de estos límites?
 *    - Hacer POCAS llamadas a los servicios: leer/escribir una planilla de a
 *      bloques y no celda por celda (tema Spreadsheet).
 *    - Si un proceso tarda más de 6 minutos: partirlo en lotes y continuar
 *      en otra ejecución con un trigger (tema Estado y jobs largos).
 *      Para eso hace falta saber cuánto tiempo queda: ver
 *      tiempoRestanteMs_ más abajo.
 *    - Guardar en Cache lo que se consulta seguido (tema Estado).
 * ============================================================================
 */

/**
 * Duración máxima de una ejecución, en milisegundos (6 minutos).
 * 1 segundo = 1000 milisegundos, así que 6 min = 6 * 60 * 1000.
 */
const MAX_EJECUCION_MS = 6 * 60 * 1000;

/**
 * Calcula cuánto tiempo le queda a la ejecución actual antes de que Google
 * la corte.
 *
 * Apps Script no tiene una función que diga "cuánto tiempo me queda", así
 * que lo calculamos nosotros: guardamos la hora de inicio (Date.now()) al
 * empezar, y restamos.
 *
 * @param {number} inicioMs  El valor de Date.now() al empezar la ejecución.
 * @returns {number}         Milisegundos que quedan (puede ser negativo).
 */
function tiempoRestanteMs_(inicioMs) {
  return MAX_EJECUCION_MS - (Date.now() - inicioMs);
}

/**
 * DEMO: patrón para procesar muchos elementos sin que la ejecución se corte.
 *
 * La idea: antes de procesar cada elemento, chequeamos si nos queda tiempo
 * suficiente. Si no, cortamos ANTES de que Google nos corte (si Google
 * corta, perdemos el control y no podemos guardar por dónde íbamos).
 *
 * Acá simulamos que cada elemento tarda 1 segundo, y fingimos que el límite
 * es de solo 5 segundos para no tener que esperar 6 minutos.
 */
function demo_cortarAntesDelLimite() {
  const inicio = Date.now();
  const elementos = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  // Margen de seguridad: el tiempo que necesitamos para guardar el avance
  // y terminar prolijamente.
  const margenMs = 1000;
  // En un caso real usaríamos tiempoRestanteMs_(inicio). Acá simulamos un
  // límite de 5 segundos:
  const tiempoQueQueda = () => 5000 - (Date.now() - inicio);

  let procesados = 0;
  for (const elemento of elementos) {
    if (tiempoQueQueda() < margenMs) {
      console.log(
        `Cortamos antes del límite. Procesados: ${procesados}. ` +
          `Siguiente a procesar: "${elemento}" (esto se guardaría para continuar después).`,
      );
      return;
    }
    Utilities.sleep(1000); // Simula un trabajo que tarda 1 segundo.
    procesados++;
  }
  console.log(`Terminamos todo: ${procesados} elementos.`);
}

/**
 * DEMO: cuánto te queda de algunas cuotas diarias.
 * Solo algunos servicios permiten consultarlo; el de mails es el más útil.
 */
function demo_cuotasRestantes() {
  console.log(
    "Mails que todavía podés mandar hoy:",
    MailApp.getRemainingDailyQuota(),
  );
}

/**
 * DEMO: medir cuánto tarda algo. Muy útil para comparar dos formas de hacer
 * lo mismo (en el tema Spreadsheet comparamos leer celda por celda contra
 * leer todo de una vez).
 */
function demo_medirTiempo() {
  const inicio = Date.now();
  Utilities.sleep(1500);
  console.log(`Tardó ${Date.now() - inicio} ms`);

  // Otra forma: console.time / console.timeEnd con la misma etiqueta.
  console.time("pausa corta");
  Utilities.sleep(500);
  console.timeEnd("pausa corta"); // Imprime "pausa corta: 50x ms"
}
