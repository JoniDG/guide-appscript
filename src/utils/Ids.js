/**
 * ============================================================================
 *  UTILS: IDENTIFICADORES (IDs) Y CÓDIGOS
 * ============================================================================
 *
 *  Un ID es un valor que identifica a UNA cosa sin confusión: un pedido, un
 *  cliente, un archivo. La regla de oro: dos cosas distintas nunca pueden
 *  tener el mismo ID (eso se llama "colisión").
 *
 *  Opciones, de la más segura a la menos:
 *
 *  1. UUID con Utilities.getUuid():
 *     "3f2a8c1e-5b7d-4e9a-8c2f-1a2b3c4d5e6f". Es prácticamente imposible
 *     que se repita. Es la opción por defecto para IDs internos.
 *
 *  2. Número correlativo (1, 2, 3...): fácil de leer y de dictar por
 *     teléfono, pero hay que guardar el último usado y protegerlo para que
 *     dos ejecuciones simultáneas no tomen el mismo (tema Estado: LockService).
 *
 *  3. Código corto al azar ("K7P2QX"): cómodo para mostrar a una persona,
 *     pero cuanto más corto, más chance de que se repita. Si es un dato
 *     importante, verificá que no exista antes de usarlo.
 *
 *  Antipatrón: armar un ID con un dato de la persona (ej: los últimos 6
 *  dígitos del celular). Dos celulares distintos pueden terminar igual, y
 *  además el ID expone un dato personal.
 *
 *  Nada de esto sirve como contraseña o token secreto: Math.random() no es
 *  impredecible de verdad. Para secretos, generalos con una herramienta
 *  pensada para eso y guardalos en las Propiedades del script.
 * ============================================================================
 */

/**
 * Genera un código corto al azar con letras y números.
 * Evita caracteres que se confunden al leer: 0/O, 1/I/L.
 *
 * @param {number} largo  Cantidad de caracteres.
 * @returns {string}
 */
function generarCodigoCorto_(largo) {
  const caracteres = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < largo; i++) {
    // Math.random() da un número entre 0 y 0,999...; multiplicado por la
    // cantidad de caracteres y redondeado para abajo da una posición válida.
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

/**
 * DEMO: las distintas formas de generar IDs.
 */
function demo_generarIds() {
  console.log("UUID:", Utilities.getUuid());
  console.log("Otro UUID (siempre distinto):", Utilities.getUuid());
  console.log("Código corto de 6:", generarCodigoCorto_(6));

  // Un ID que además dice CUÁNDO se creó: útil para ordenar. Se combina con
  // algo al azar porque dos ejecuciones pueden pasar en el mismo segundo.
  const fecha = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMdd-HHmmss",
  );
  console.log("ID con fecha:", `${fecha}-${generarCodigoCorto_(4)}`);
}
