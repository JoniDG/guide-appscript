/**
 * ============================================================================
 *  TRIGGERS 1: CONCEPTOS (CÓDIGO QUE SE EJECUTA SOLO)
 * ============================================================================
 *
 *  Un "trigger" (activador) hace que una función se ejecute AUTOMÁTICAMENTE
 *  cuando pasa algo: alguien edita una celda, se abre la planilla, llega
 *  una respuesta de un formulario, o simplemente pasa el tiempo ("todos
 *  los días a las 8"). Es lo que convierte una planilla en un sistema que
 *  trabaja solo.
 *
 *  HAY DOS TIPOS
 *
 *  1. TRIGGERS SIMPLES: funciones con un nombre "reservado". Google las
 *     ejecuta solas, sin configurar nada:
 *       onOpen(e)            -> al abrir la planilla (ver html/Menu.js)
 *       onEdit(e)            -> al editar una celda A MANO
 *       onSelectionChange(e) -> al seleccionar otra celda o rango
 *     (doGet y doPost, del tema Backend, también tienen nombre reservado,
 *     pero NO tienen los límites que siguen: corren con permisos completos
 *     y hasta 6 minutos.)
 *     Límites de los simples:
 *       - Corren con permisos LIMITADOS: pueden leer y escribir la planilla
 *         que contiene al código, pero NO pueden usar nada que pida
 *         autorización: mandar mails, abrir otros archivos, usar Drive,
 *         llamar a URLs externas. (Lo comprobamos de verdad en Simples.js.)
 *       - Máximo 30 segundos.
 *       - Solo puede haber UNA función con cada nombre en todo el proyecto:
 *         un solo onEdit, que reparte el trabajo según la hoja.
 *       - No corren si quien abre la planilla solo tiene permiso de lectura.
 *
 *  2. TRIGGERS INSTALABLES: se "instalan" (desde el panel Activadores del
 *     editor, el ícono del reloj, o por código con ScriptApp.newTrigger) y
 *     llaman a la función que vos elijas, con el nombre que quieras:
 *       - De la planilla: al editar, al cambiar la estructura (onChange),
 *         al abrir, al enviar un formulario conectado.
 *       - Por tiempo: cada X minutos u horas, todos los días a cierta hora,
 *         ciertos días de la semana, o UNA sola vez en una fecha.
 *       - De otros servicios: Calendar (al cambiar un evento), Forms.
 *     Diferencias con los simples:
 *       - Corren con TODOS los permisos de quien los instaló, y "como" esa
 *         persona, sin importar quién disparó el evento (por ejemplo, si
 *         otro usuario edita la planilla).
 *       - Hasta 6 minutos por ejecución.
 *       - Si fallan, Google te manda un mail con el resumen (la frecuencia
 *         se configura en el panel Activadores, editando el activador).
 *       - Máximo 20 triggers por usuario y por proyecto, y en cuentas
 *         gratuitas 90 minutos por día de ejecución entre todos (ver
 *         fundamentos/Limites.js).
 *
 *  OJO CON LOS DOS JUNTOS: si existe la función onEdit (simple) Y además
 *  instalás un trigger "al editar", en cada edición corren LOS DOS.
 *
 *  ¿QUÉ NO DISPARA onEdit?
 *  Solo lo disparan las ediciones hechas por una PERSONA en la planilla.
 *  NO lo disparan: los cambios que hace un script (por eso un onEdit que
 *  escribe en la hoja no se dispara a sí mismo en un bucle infinito), los
 *  cambios por la API, ni las fórmulas que se recalculan.
 *
 *  EL OBJETO "e" DE onEdit (lo que llega con cada edición)
 *    e.range     -> el rango editado (una celda, o varias si se pegó algo)
 *    e.value     -> el valor nuevo (solo si se editó UNA celda; las
 *                   casillas llegan como el texto "TRUE" o "FALSE")
 *    e.oldValue  -> el valor anterior (solo una celda; si no había nada,
 *                   la propiedad directamente no viene: undefined)
 *    e.source    -> la planilla
 *    e.user      -> quién editó (muchas veces llega VACÍO por privacidad)
 *    e.authMode  -> con qué permisos corre (LIMITED en los simples, FULL
 *                   en los instalables)
 *    e.triggerUid-> el ID del trigger (solo en los instalables)
 *
 *  PUNTUALIDAD de los triggers por tiempo: "a las 8" significa "en algún
 *  momento entre las 8 y las 9" (Google reparte la carga). "Cada 5
 *  minutos" puede correrse varios minutos, sobre todo la primera vez. No
 *  sirven para algo que tenga que pasar en un momento exacto.
 * ============================================================================
 */

/**
 * Agrega una fila a la hoja "Registro de triggers": así se ve qué trigger
 * corrió, cuándo y qué hizo, sin entrar al panel Ejecuciones.
 *
 * @param {string} origen   Qué trigger o función escribe.
 * @param {string} detalle
 */
function registrar_(origen, detalle) {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_REGISTRO_TRIGGERS);
  if (hoja === null) {
    // Si todavía no se corrió setup(), al menos queda en el log.
    console.warn(
      `[${origen}] ${detalle} (falta la hoja ${SHEET_REGISTRO_TRIGGERS}: corré setup())`,
    );
    return;
  }
  hoja.appendRow([new Date(), origen, String(detalle)]);
}
