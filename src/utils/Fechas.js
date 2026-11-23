/**
 * ============================================================================
 *  UTILS: FECHAS Y HORAS
 * ============================================================================
 *
 *  En JavaScript, una fecha es un objeto Date: new Date() da "ahora mismo".
 *  Internamente, un Date es un instante exacto (la cantidad de milisegundos
 *  desde el 1/1/1970 en hora universal, UTC), SIN zona horaria. La zona
 *  horaria recién importa cuando lo convertimos a texto para mostrarlo
 *  ("23/11/2026 10:30") o cuando le pedimos "la hora" o "el día".
 *
 *  ¿Qué zona horaria usa Apps Script?
 *  La del PROYECTO, que se configura en appsscript.json ("timeZone":
 *  "America/Argentina/Buenos_Aires") y se consulta con
 *  Session.getScriptTimeZone(). Métodos como getHours() o getDate() de un
 *  Date responden según esa zona.
 *
 *  La trampa: no es la única zona horaria en juego.
 *    - La PLANILLA tiene la suya (Archivo > Configuración), que puede ser
 *      distinta a la del proyecto (lo vemos en el tema Spreadsheet).
 *    - La persona que usa tu web app o tu planilla puede estar en otro país.
 *    - Un proyecto creado desde cero arranca con la zona de quien lo creó (o
 *      una por defecto), no necesariamente la tuya.
 *  Si esas zonas no coinciden, la misma fecha se ve con horas distintas.
 *
 *  La solución: Utilities.formatDate(fecha, zonaHoraria, patrón), diciendo
 *  SIEMPRE en qué zona queremos ver la fecha. Así el resultado no depende
 *  de configuraciones que alguien puede cambiar sin avisar.
 *
 *  Patrones más usados en formatDate (distingue mayúsculas de minúsculas):
 *    dd   -> día con 2 dígitos (05)       MM   -> mes con 2 dígitos (03)
 *    yyyy -> año (2026)                   HH   -> hora 00-23
 *    mm   -> minutos (¡minúscula!)        ss   -> segundos
 *    EEEE -> nombre del día (en inglés: Monday)   MMMM -> nombre del mes (March)
 *    Ejemplos: "dd/MM/yyyy" -> 05/03/2026,  "HH:mm" -> 14:07,
 *              "yyyy-MM-dd'T'HH:mm:ss" -> 2026-03-05T14:07:00
 *    El texto fijo va entre comillas simples: 'T', 'hs'.
 * ============================================================================
 */

/**
 * Convierte una fecha a texto con el patrón que quieras, en la zona horaria
 * del proyecto.
 *
 * @param {Date} fecha
 * @param {string} patron  Ej: "dd/MM/yyyy HH:mm".
 * @returns {string}
 */
function formatearFecha_(fecha, patron) {
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), patron);
}

/**
 * Convierte un texto con una fecha a un objeto Date.
 *
 * Por qué no usar new Date("05/03/2026"): JavaScript asume el formato de
 * Estados Unidos (mes/día/año) y lo interpretaría como 3 de mayo. Con
 * Utilities.parseDate le decimos exactamente qué formato tiene el texto.
 *
 * @param {string} texto   Ej: "05/03/2026".
 * @param {string} patron  Ej: "dd/MM/yyyy".
 * @returns {Date}
 */
function leerFecha_(texto, patron) {
  return Utilities.parseDate(texto, Session.getScriptTimeZone(), patron);
}

/**
 * Devuelve una fecha nueva sumando (o restando, si es negativo) días.
 * No modifica la fecha original.
 *
 * @param {Date} fecha
 * @param {number} dias
 * @returns {Date}
 */
function sumarDias_(fecha, dias) {
  // new Date(fecha) hace una COPIA. Si modificáramos "fecha" directamente,
  // cambiaríamos también la fecha de quien llamó a la función.
  const copia = new Date(fecha);
  // setDate acepta valores "fuera de rango" y los acomoda solo:
  // 31 de enero + 1 día = 1 de febrero.
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/**
 * Cuántos días de calendario hay entre dos fechas (sin contar las horas).
 * Positivo si "hasta" es posterior a "desde".
 *
 * Por qué no restar las fechas y dividir por 24 horas: los días con cambio
 * de horario de verano duran 23 o 25 horas, y la cuenta puede dar un día
 * de menos. Comparando solo año/mes/día en UTC (hora universal, que no
 * tiene horario de verano) siempre da bien.
 *
 * @param {Date} desde
 * @param {Date} hasta
 * @returns {number}
 */
function diasEntre_(desde, hasta) {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const utcDesde = Date.UTC(
    desde.getFullYear(),
    desde.getMonth(),
    desde.getDate(),
  );
  const utcHasta = Date.UTC(
    hasta.getFullYear(),
    hasta.getMonth(),
    hasta.getDate(),
  );
  return Math.round((utcHasta - utcDesde) / MS_POR_DIA);
}

/**
 * DEMO: formatear la fecha actual de distintas formas.
 */
function demo_formatearFechas() {
  const ahora = new Date();
  console.log("Zona horaria del proyecto:", Session.getScriptTimeZone());
  console.log("Fecha:", formatearFecha_(ahora, "dd/MM/yyyy"));
  console.log("Hora:", formatearFecha_(ahora, "HH:mm:ss"));
  console.log("Fecha y hora:", formatearFecha_(ahora, "dd/MM/yyyy HH:mm'hs'"));
  console.log(
    "Formato ISO (para APIs):",
    formatearFecha_(ahora, "yyyy-MM-dd'T'HH:mm:ssXXX"),
  );
  console.log(
    "Para nombres de archivo:",
    formatearFecha_(ahora, "yyyyMMdd_HHmmss"),
  );

  // La misma fecha en OTRA zona horaria: el instante es el mismo, cambia
  // solo cómo se muestra.
  console.log(
    "Ahora en Madrid:",
    Utilities.formatDate(ahora, "Europe/Madrid", "HH:mm"),
  );
}

/**
 * DEMO: leer fechas escritas como texto y hacer cuentas.
 */
function demo_cuentasConFechas() {
  const vencimiento = leerFecha_("14/10/2026", "dd/MM/yyyy");
  const inicio = leerFecha_("14/10/2025", "dd/MM/yyyy");

  console.log("Días entre las dos fechas:", diasEntre_(inicio, vencimiento)); // 365
  console.log(
    "30 días después del inicio:",
    formatearFecha_(sumarDias_(inicio, 30), "dd/MM/yyyy"),
  );
  console.log(
    "Una semana antes:",
    formatearFecha_(sumarDias_(vencimiento, -7), "dd/MM/yyyy"),
  );

  // Comparar fechas: < y > funcionan directo con objetos Date.
  console.log("¿Ya venció?", new Date() > vencimiento);

  // Para saber si dos fechas son el MISMO día, no uses ===: compara si son
  // el mismo objeto, no si tienen el mismo valor. Compará los textos.
  const hoy = formatearFecha_(new Date(), "yyyy-MM-dd");
  console.log(
    "¿Vence hoy?",
    formatearFecha_(vencimiento, "yyyy-MM-dd") === hoy,
  );
}
