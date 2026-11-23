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
 *    Los dos se ven en el Registro de ejecución del editor y en el panel
 *    Ejecuciones. En esta guía usamos console.
 *
 *  Ojo con los niveles en el panel Ejecuciones:
 *    - console.log aparece como "Depuración" (en el editor dice
 *      "Información", pero en el panel cambia). console.time/timeEnd también.
 *    - console.info y Logger.log aparecen como "Información".
 *    Si en el panel filtrás por "Información", los console.log no se ven.
 *    Regla práctica: console.info para lo que querés encontrar después,
 *    console.log para el detalle de depuración.
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
  // Rareza: los números salen con decimal. Esto imprime "tenés 3.0 mensajes"
  // (las plantillas de Logger vienen de Java, que trata los números así).
  Logger.log("Hola %s, tenés %s mensajes", "Ana", 3);
  // Para evitarlo, armá el texto vos con un template literal (`${...}`):
  Logger.log(`Hola Ana, tenés ${3} mensajes`);
  Logger.log("Tercera línea");

  // getLog devuelve TODO lo que se logueó con Logger en esta ejecución.
  const todoElLog = Logger.getLog();
  console.log("Lo que juntó Logger:\n" + todoElLog);
}
