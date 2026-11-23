/**
 * ============================================================================
 *  FUNDAMENTOS 1: CÓMO SE EJECUTA EL CÓDIGO DE APPS SCRIPT
 * ============================================================================
 *
 *  ¿Dónde corre este código?
 *  NO en tu computadora. Cuando ejecutás una función, Google la corre en sus
 *  servidores. Tu navegador solo muestra el editor y el resultado.
 *
 *  ¿Qué es una "ejecución"?
 *  Cada vez que se corre una función, Google arma un "entorno" nuevo desde
 *  cero, corre la función y al terminar tira todo a la basura. Una ejecución
 *  puede arrancar de varias formas:
 *
 *    1. Desde el editor, con el botón ▶ Ejecutar.
 *    2. Por un activador (trigger): cada X minutos, al abrir la planilla,
 *       al editar una celda, al llegar un formulario... (tema Triggers).
 *    3. Por un pedido desde internet al web app: doGet / doPost
 *       (tema Backend).
 *    4. Desde una página HTML con google.script.run (tema HTML / UI).
 *    5. Como "función personalizada" escrita en una celda: =MIFUNCION(A1)
 *       (tema Spreadsheet).
 *    6. Desde un menú personalizado de la planilla.
 *
 *  ¿Qué pasa al principio de CADA ejecución?
 *  Google carga TODOS los archivos de código del proyecto (en el editor se
 *  ven como .gs; en este repo son .js porque clasp los convierte al subir),
 *  en orden, y ejecuta todo
 *  el código que esté "suelto" (fuera de una función). Recién después llama
 *  a la función que pediste. Esto tiene 3 consecuencias importantes:
 *
 *    a) Todos los archivos comparten el mismo "espacio global": una función
 *       definida en un archivo se puede usar en cualquier otro, sin import.
 *
 *    b) El código suelto se ejecuta SIEMPRE, aunque ejecutes otra función.
 *       Si ponés algo lento suelto (ej: abrir una planilla con openById),
 *       vas a hacer más lentas TODAS las ejecuciones del proyecto.
 *       Regla: fuera de las funciones, solo constantes simples (textos,
 *       números, listas). Todo lo demás, adentro de funciones.
 *
 *    c) Las variables globales NO guardan nada entre ejecuciones: arrancan
 *       de cero cada vez. Para "recordar" algo entre ejecuciones hay que
 *       guardarlo en otro lado: Propiedades del script, Cache, una hoja...
 *       (tema Estado). Mirá demo_lasVariablesGlobalesNoPersisten.
 *
 *  ¿Quién ejecuta el código? (importa para los permisos)
 *  - Desde el editor o un menú: el usuario que lo dispara.
 *  - Trigger simple (onOpen, onEdit...): el usuario que lo dispara, pero en
 *    "modo limitado": NO puede usar servicios que piden autorización (como
 *    mandar mails o abrir otros archivos), y no corre si el archivo se abrió
 *    en modo solo lectura.
 *  - Trigger instalable: el usuario que CREÓ el trigger, aunque lo dispare
 *    otra persona (por ejemplo, alguien que edita la planilla). Puede usar
 *    todos los servicios que ese usuario autorizó.
 *  - Función personalizada en una celda (=MIFUNCION()): sin identidad y sin
 *    autorización. Solo puede hacer cálculos y usar servicios que no piden
 *    permisos.
 *  - Web app: depende de "executeAs" en appsscript.json:
 *      USER_DEPLOYING  -> siempre como quien publicó el web app.
 *      USER_ACCESSING  -> como la persona que entra (tiene que loguearse).
 *
 *  Permisos (scopes):
 *  Apps Script lee tu código y detecta solo qué servicios usás (Sheets,
 *  Drive, Gmail...). La primera vez que ejecutás algo te pide permiso para
 *  esos servicios. Si agregás un servicio nuevo, te vuelve a pedir permiso.
 *  Se pueden fijar a mano en appsscript.json con "oauthScopes", y en un
 *  script ligado a una planilla se puede limitar el acceso SOLO a esa
 *  planilla escribiendo la anotación especial "OnlyCurrentDoc" (con una
 *  arroba pegada adelante) dentro de un comentario de tipo /** ... * /, en
 *  cualquier archivo. Sirve para pedir menos permisos.
 *  Ojo: Apps Script la busca en los comentarios y la ACTIVA aunque esté en
 *  medio de una explicación. Por eso acá no la escribimos con la arroba:
 *  si la activáramos, la guía no podría usar Drive ni otras planillas.
 * ============================================================================
 */

/**
 * Este contador está "suelto" (fuera de una función): se crea en 0 al
 * empezar CADA ejecución. Lo usa demo_lasVariablesGlobalesNoPersisten.
 */
let contadorDeEjecuciones = 0;

/**
 * DEMO: el "hola mundo". Ejecutalo y mirá el Registro de ejecución (abajo).
 */
function demo_holaMundo() {
  console.log("¡Hola desde los servidores de Google!");
}

/**
 * DEMO: las variables globales NO guardan su valor entre ejecuciones.
 *
 * Ejecutalo varias veces: siempre va a mostrar 1, nunca 2, 3, 4...
 * Porque en cada ejecución el archivo se vuelve a cargar y
 * contadorDeEjecuciones vuelve a empezar en 0.
 *
 * Para contar de verdad, guardamos el número en las Propiedades del script,
 * que SÍ sobreviven entre ejecuciones.
 */
function demo_lasVariablesGlobalesNoPersisten() {
  contadorDeEjecuciones++;
  console.log(`Variable global: ${contadorDeEjecuciones} (siempre 1)`);

  const props = PropertiesService.getScriptProperties();
  // getProperty devuelve texto (o null si no existe). Number(...) lo pasa a
  // número; si es null, Number(null) da 0.
  const contadorGuardado = Number(props.getProperty("DEMO_CONTADOR")) + 1;
  props.setProperty("DEMO_CONTADOR", String(contadorGuardado));
  console.log(
    `Propiedad del script: ${contadorGuardado} (sube en cada ejecución)`,
  );
}

/**
 * DEMO: información sobre quién y dónde se está ejecutando el código.
 */
function demo_quienEjecuta() {
  // getEffectiveUser: la cuenta con cuyos permisos corre el código.
  console.log("Usuario efectivo:", Session.getEffectiveUser().getEmail());

  // getActiveUser: la persona que disparó la ejecución. Por privacidad,
  // Google muchas veces la devuelve VACÍA: en triggers simples, en
  // funciones personalizadas, en web apps que corren "como yo"
  // (USER_DEPLOYING, como el de esta guía) y cuando esa persona es de otro
  // dominio o usa una cuenta @gmail.com. Desde el editor sí aparece.
  // No te bases en este valor para seguridad.
  console.log(
    "Usuario activo:",
    Session.getActiveUser().getEmail() || "(vacío)",
  );

  // Zona horaria del PROYECTO (se define en appsscript.json). Afecta a cómo
  // se formatean las fechas. Ver utils/Fechas.js.
  console.log("Zona horaria del script:", Session.getScriptTimeZone());

  // Idioma/región de quien ejecuta (ej: "es", "es_419", "en").
  console.log("Idioma del usuario:", Session.getActiveUserLocale());
}

/**
 * DEMO: todos los archivos comparten el mismo espacio global.
 *
 * Esta función usa getGuideSpreadsheet_, que está definida en OTRO archivo
 * (config/Config.js), sin ningún import: Google cargó todo el proyecto
 * antes de llamarla.
 */
function demo_espacioGlobalCompartido() {
  console.log(
    "Función de otro archivo (config/Config.js):",
    getGuideSpreadsheet_().getName(),
  );
}
