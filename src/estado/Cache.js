/**
 * ============================================================================
 *  ESTADO 1: CACHESERVICE (GUARDAR RESULTADOS PARA NO RECALCULARLOS)
 * ============================================================================
 *
 *  Las variables globales se borran al terminar cada ejecución (ver
 *  fundamentos/ComoSeEjecuta.js). Para "recordar" algo entre ejecuciones
 *  hay dos herramientas principales:
 *
 *    CacheService  -> memoria RÁPIDA y TEMPORAL. Ideal para resultados que
 *                     cuesta calcular pero se pueden recalcular (una lista
 *                     sacada de 5.000 filas, la respuesta de una API lenta).
 *    Properties    -> almacenamiento PERMANENTE pero chico (Propiedades.js).
 *
 *  Reglas del cache:
 *    - Guarda TEXTO: para objetos, JSON.stringify al guardar y JSON.parse
 *      al leer.
 *    - Cada valor dura lo que le digas, como máximo 6 horas (21.600 seg).
 *      Sin decir nada, dura 10 minutos.
 *    - Cada valor puede pesar como máximo 100 KB, y cada clave hasta 250
 *      caracteres.
 *    - Google lo puede borrar ANTES de tiempo si necesita memoria. Nunca
 *      guardes en cache algo que no puedas volver a calcular.
 *
 *  Tres caches distintos:
 *    CacheService.getScriptCache()   -> compartido por todos los usuarios
 *    CacheService.getUserCache()     -> uno por usuario
 *    CacheService.getDocumentCache() -> uno por documento (scripts ligados)
 *
 *  EL PATRÓN "LEER CON CACHE" (cache-aside):
 *    1. ¿Está en el cache? -> lo devuelvo (rapidísimo).
 *    2. ¿No está? -> lo calculo (lento), lo guardo en el cache y lo devuelvo.
 *  El problema clásico: si los datos de origen CAMBIAN, el cache queda
 *  viejo hasta que vence. Opciones: duración corta, o borrar la clave
 *  ("invalidar") cada vez que se modifican los datos.
 * ============================================================================
 */

/**
 * Tamaño de cada pedazo al guardar valores grandes, en CARACTERES. El
 * límite de 100 KB puede contar BYTES, y un carácter con acento o un emoji
 * ocupa 2 a 4 bytes: con 32.000 caracteres, cada pedazo queda por debajo de
 * los 100 KB aunque todo el texto fueran caracteres "pesados".
 */
const TAMANIO_PEDAZO_CACHE = 32 * 1024;

/**
 * Devuelve un valor del cache, o lo calcula y lo guarda si no está.
 *
 * @param {string} clave
 * @param {number} segundos             Cuánto tiempo guardarlo (máx. 21600).
 * @param {() => *} calcular            Función que calcula el valor si hace falta.
 *   Tiene que devolver algo que se pueda pasar a JSON (no undefined), y que
 *   pese menos de 100 KB (si no, usá guardarGrandeEnCache_).
 * @returns {*}                         El valor (objeto, lista, número...).
 */
function leerConCache_(clave, segundos, calcular) {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get(clave); // null si no está (o si venció)
  if (guardado !== null) {
    return JSON.parse(guardado);
  }
  const valor = calcular();
  cache.put(clave, JSON.stringify(valor), segundos);
  return valor;
}

/**
 * Guarda un valor que puede pesar MÁS de 100 KB, partiéndolo en pedazos:
 *   clave + "#0", clave + "#1", ...  (cada uno de hasta 90 KB)
 *   clave + "#partes" -> cuántos pedazos hay
 * putAll los guarda todos en un solo viaje.
 *
 * @param {string} clave
 * @param {*} valor
 * @param {number} segundos
 */
function guardarGrandeEnCache_(clave, valor, segundos) {
  const texto = JSON.stringify(valor);
  const pedazos = {};
  let partes = 0;
  let i = 0;
  while (i < texto.length) {
    let fin = Math.min(i + TAMANIO_PEDAZO_CACHE, texto.length);
    // Algunos caracteres (como los emojis) ocupan DOS posiciones en un
    // texto de JavaScript. Si el corte cae justo en el medio de uno, lo
    // corremos una posición para no partirlo.
    const codigo = texto.charCodeAt(fin - 1);
    if (fin < texto.length && codigo >= 0xd800 && codigo <= 0xdbff) {
      fin--;
    }
    pedazos[`${clave}#${partes}`] = texto.slice(i, fin);
    partes++;
    i = fin;
  }
  pedazos[`${clave}#partes`] = String(partes);
  CacheService.getScriptCache().putAll(pedazos, segundos);
}

/**
 * Lee un valor guardado con guardarGrandeEnCache_. Si falta CUALQUIER
 * pedazo (el cache puede borrar algunos), devuelve null: un valor a medias
 * no sirve.
 *
 * @param {string} clave
 * @returns {*|null}
 */
function leerGrandeDeCache_(clave) {
  const cache = CacheService.getScriptCache();
  const partes = Number(cache.get(`${clave}#partes`));
  if (!partes) {
    return null;
  }
  const claves = Array.from({ length: partes }, (_, i) => `${clave}#${i}`);
  // getAll: varias claves en un solo viaje. Devuelve un objeto
  // { clave: valor } solo con las que encontró.
  const encontrados = cache.getAll(claves);
  if (claves.some((c) => !(c in encontrados))) {
    return null;
  }
  return JSON.parse(claves.map((c) => encontrados[c]).join(""));
}

/**
 * DEMO: lo básico del cache (es la versión explicada del myCache original).
 */
function demo_cacheBasico() {
  const cache = CacheService.getScriptCache();
  cache.put("saludo", "hola", 60); // dura 60 segundos
  console.log("saludo:", cache.get("saludo"));
  console.log("algo que no existe:", cache.get("no-existe")); // null

  // Varios valores de una vez.
  cache.putAll({ color: "azul", fruta: "pera" }, 60);
  console.log(
    "getAll:",
    JSON.stringify(cache.getAll(["color", "fruta", "no-existe"])),
  );

  // Objetos: hay que pasarlos a texto.
  cache.put("persona", JSON.stringify({ nombre: "Ana", edad: 30 }), 60);
  console.log("objeto:", JSON.parse(cache.get("persona")).nombre);

  cache.remove("saludo");
  cache.removeAll(["color", "fruta", "persona"]);
  console.log("después de borrar:", cache.get("saludo"));
}

/**
 * DEMO (benchmark): la lista de ciudades de Clientes (5.000 filas), con y
 * sin cache. La primera vez se calcula; las siguientes salen del cache.
 */
function demo_cacheConBenchmark() {
  const clave = "demo-ciudades";
  CacheService.getScriptCache().remove(clave); // empezamos sin cache

  for (let intento = 1; intento <= 3; intento++) {
    const inicio = Date.now();
    const ciudades = leerConCache_(clave, 300, ciudadesDeClientes_);
    console.log(
      `Intento ${intento}: ${ciudades.length} ciudades en ${Date.now() - inicio} ms`,
    );
  }
}

/**
 * DEMO: guardar en cache un índice "email -> fila" de los 5.000 clientes,
 * que pesa más de 100 KB (no entra en una sola clave).
 */
function demo_cacheDeValorGrande() {
  const clave = "demo-indice-emails";
  const inicio = Date.now();
  let indice = leerGrandeDeCache_(clave);
  if (indice === null) {
    const valores = getGuideSpreadsheet_()
      .getSheetByName(SHEET_CLIENTES)
      .getDataRange()
      .getValues();
    indice = {};
    valores.slice(1).forEach((fila, i) => {
      indice[fila[COL_CLIENTES.email - 1]] = i + 2;
    });
    guardarGrandeEnCache_(clave, indice, 600);
    console.log(
      `Calculado y guardado (${JSON.stringify(indice).length} caracteres) en ${Date.now() - inicio} ms`,
    );
  } else {
    console.log(`Leído del cache en ${Date.now() - inicio} ms`);
  }
  console.log(
    "Fila de carla.gomez1@example.com:",
    indice["carla.gomez1@example.com"],
  );
  console.log("Ejecutalo de nuevo: la segunda vez sale del cache.");
}
