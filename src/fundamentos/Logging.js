/**
 * ============================================================================
 *  FUNDAMENTOS 3: LOGGING (MOSTRAR MENSAJES PARA ENTENDER QUÉ PASA)
 * ============================================================================
 *
 *  "Loguear" es escribir mensajes mientras el código corre, para después
 *  leerlos y entender qué pasó. Es la herramienta principal para encontrar
 *  errores en Apps Script.
 *
 *  ¿Dónde se ven los mensajes?
 *    - Ejecutando desde el editor: en el "Registro de ejecución" que se abre
 *      abajo.
 *    - Ejecuciones que NO arrancaste vos (triggers, web app, menús): en el
 *      panel "Ejecuciones" (ícono ☰▶ en la barra izquierda del editor).
 *      Ahí hay una fila por ejecución, con su estado, duración y mensajes.
 *    - Google Cloud Logging: si el proyecto está conectado a un proyecto de
 *      Google Cloud, los mensajes quedan guardados más tiempo y se pueden
 *      buscar (tema Avanzado).
 *
 *  ¿console.log o Logger.log?
 *    - console.log / console.info / console.warn / console.error: la forma
 *      moderna. Tienen niveles (info, advertencia, error) que después se
 *      pueden filtrar, y se ven en el panel Ejecuciones.
 *    - Logger.log: la forma vieja. No tiene niveles (todo es "info"), pero
 *      tiene una ventaja: Logger.getLog() devuelve todo lo logueado en la
 *      ejecución como texto (útil, por ejemplo, para mandarlo por mail).
 *    En esta guía usamos console.
 *
 *  Los mensajes NO son privados para los editores del proyecto: no loguees
 *  contraseñas, API keys ni datos personales que no haga falta ver.
 * ============================================================================
 */

/**
 * DEMO: los distintos niveles de mensaje.
 * En el panel Ejecuciones cada uno aparece con su color/ícono.
 */
function demo_nivelesDeLog() {
  console.log("Mensaje común (log)");
  console.info("Información (info)");
  console.warn("Advertencia: algo raro pero no grave (warn)");
  console.error("Error: algo salió mal (error)");
}

/**
 * DEMO: cómo loguear objetos y listas para que se lean bien.
 */
function demo_loguearObjetos() {
  const persona = { nombre: "Ana", edad: 30, hobbies: ["leer", "correr"] };

  // console.log puede recibir varios valores separados por coma.
  console.log("Persona:", persona);

  // JSON.stringify convierte el objeto a texto. Con (objeto, null, 2) lo
  // deja "lindo", con saltos de línea y 2 espacios de sangría.
  console.log("Persona formateada:\n" + JSON.stringify(persona, null, 2));

  // Ojo con los objetos de Google (planillas, hojas, archivos): loguearlos
  // muestra algo poco útil. Mejor loguear un dato concreto de ellos.
  const spreadsheet = getGuideSpreadsheet_();
  console.log("Así NO:", spreadsheet);
  console.log("Así SÍ:", spreadsheet.getName(), spreadsheet.getUrl());
}

/**
 * DEMO: Logger.log y Logger.getLog().
 */
function demo_loggerViejo() {
  // Logger.log acepta "plantillas": %s se reemplaza por los valores que
  // vienen después, en orden.
  Logger.log("Hola %s, tenés %s mensajes", "Ana", 3);
  Logger.log("Segunda línea");

  // getLog devuelve TODO lo que se logueó con Logger en esta ejecución.
  const todoElLog = Logger.getLog();
  console.log("Lo que juntó Logger:\n" + todoElLog);
}
