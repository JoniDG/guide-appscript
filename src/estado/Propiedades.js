/**
 * ============================================================================
 *  ESTADO 2: PROPERTIESSERVICE (GUARDAR DATOS CHICOS PARA SIEMPRE)
 * ============================================================================
 *
 *  Las "Propiedades" son pares clave = valor que se guardan en Google, junto
 *  al proyecto, y NO vencen (a diferencia del cache). Ya las usamos para la
 *  configuración y los secretos (config/Config.js).
 *
 *  Hay tres "almacenes":
 *    getScriptProperties()   -> del PROYECTO: iguales para todos los
 *                               usuarios. Configuración, secretos, el
 *                               avance de un proceso largo.
 *    getUserProperties()     -> de cada USUARIO: cada persona que usa el
 *                               script ve las suyas. Preferencias personales.
 *    getDocumentProperties() -> del DOCUMENTO (en scripts ligados, la
 *                               planilla). Útil en complementos instalados
 *                               en muchos documentos.
 *
 *  Límites (ver fundamentos/Limites.js):
 *    - Cada valor: hasta ~9 KB. Total por almacén: 500 KB.
 *    - Guardan TEXTO: objetos con JSON.stringify / JSON.parse; números y
 *      booleanos vuelven como texto ("5", "true").
 *    - Hay una cuota diaria de lecturas y escrituras: no las uses como
 *      base de datos que se escribe miles de veces (para eso, una hoja).
 *
 *  Leer o escribir VARIAS propiedades de una vez es más rápido que de a
 *  una: getProperties() / setProperties({...}).
 * ============================================================================
 */

/**
 * Guarda un objeto como JSON en las propiedades de un almacén.
 *
 * @param {GoogleAppsScript.Properties.Properties} almacen
 * @param {string} clave
 * @param {*} valor
 */
function guardarJson_(almacen, clave, valor) {
  const texto = JSON.stringify(valor);
  // Chequeamos el tamaño antes: si pasa de 9 KB, Google tira un error poco
  // claro. Mejor uno nuestro que explique qué pasó.
  if (Utilities.newBlob(texto).getBytes().length > 9 * 1024) {
    throw new Error(`"${clave}" pesa más de 9 KB: no entra en una propiedad`);
  }
  almacen.setProperty(clave, texto);
}

/**
 * Lee un objeto guardado con guardarJson_, o devuelve "porDefecto" si no
 * existe.
 *
 * @param {GoogleAppsScript.Properties.Properties} almacen
 * @param {string} clave
 * @param {*} porDefecto
 * @returns {*}
 */
function leerJson_(almacen, clave, porDefecto) {
  const texto = almacen.getProperty(clave);
  return texto === null ? porDefecto : JSON.parse(texto);
}

/**
 * DEMO: preferencias POR USUARIO. Cada persona que ejecute esto ve y
 * modifica las suyas, sin pisar las de los demás.
 */
function demo_preferenciasDeUsuario() {
  const props = PropertiesService.getUserProperties();
  const prefs = leerJson_(props, "preferencias", {
    tema: "claro",
    ejecuciones: 0,
  });
  prefs.ejecuciones++;
  prefs.ultimaVez = formatearFecha_(new Date(), "dd/MM/yyyy HH:mm:ss");
  guardarJson_(props, "preferencias", prefs);
  console.log("Tus preferencias:", JSON.stringify(prefs));
}

/**
 * DEMO: leer y escribir en lote, y ver qué hay guardado.
 */
function demo_propiedadesEnLote() {
  const props = PropertiesService.getScriptProperties();

  // setProperties: varias de una vez (un solo viaje).
  props.setProperties({ DEMO_A: "1", DEMO_B: "2", DEMO_C: "3" });

  // getProperties: TODAS, como objeto.
  const todas = props.getProperties();
  const demo = Object.keys(todas).filter((k) => k.startsWith("DEMO_"));
  console.log(
    "Propiedades de demo:",
    demo.map((k) => `${k}=${todas[k]}`).join(", "),
  );
  console.log("Ojo, vuelven como texto:", typeof todas.DEMO_A);

  // Limpieza.
  ["DEMO_A", "DEMO_B", "DEMO_C"].forEach((k) => props.deleteProperty(k));

  // OJO: setProperties(objeto, true) BORRA todas las propiedades que no
  // estén en el objeto (incluidos tus secretos y la config de la guía).
  // Por eso no lo usamos acá.
}
