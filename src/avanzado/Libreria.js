/**
 * ============================================================================
 *  AVANZADO 3: USAR ESTE PROYECTO COMO BIBLIOTECA (LIBRARY)
 * ============================================================================
 *
 *  Una BIBLIOTECA es un proyecto de Apps Script cuyas funciones se pueden
 *  usar desde OTROS proyectos. Sirve para no copiar y pegar el mismo
 *  código (formatear montos, normalizar textos, llamar a una API) en cada
 *  proyecto del trabajo: se escribe una vez y todos lo usan.
 *
 *  CÓMO PUBLICAR ESTE PROYECTO COMO BIBLIOTECA
 *    1. Implementar > Nueva implementación > en el engranaje elegí
 *       "Biblioteca" > descripción > Implementar. Eso crea una VERSIÓN
 *       numerada (1, 2, 3...).
 *    2. Copiá el "ID de la secuencia de comandos" (Configuración del
 *       proyecto > IDs).
 *
 *  CÓMO USARLA DESDE OTRO PROYECTO
 *    1. En el otro proyecto: Bibliotecas + (a la izquierda) > pegá el ID >
 *       Buscar > elegí la versión > Identificador: por ejemplo "Guia" >
 *       Agregar.
 *    2. Desde ese proyecto: Guia.formatearMontoArgentino(1878.3)
 *
 *  REGLAS
 *    - Solo se ven las funciones PÚBLICAS (las que no terminan en "_").
 *      Por eso este archivo tiene versiones públicas, con nombres claros,
 *      de algunos helpers privados de la guía.
 *    - Las CONSTANTES (const, let) de la biblioteca NO se ven desde afuera:
 *      Guia.ESTILOS_MAIL daría undefined. Si otro proyecto necesita un
 *      valor, exponé una función que lo devuelva.
 *    - El que la usa elige una VERSIÓN fija: si cambiás la biblioteca, los
 *      demás proyectos no se enteran hasta que publiques una versión nueva
 *      Y ellos la elijan. Con "Modo de desarrollo" (HEAD) usan siempre el
 *      código más nuevo: cómodo para probar, peligroso en producción (y
 *      hasta donde se sabe, solo vale para quienes pueden EDITAR la
 *      biblioteca; los demás usan la versión elegida).
 *    - El que la usa tiene que poder VER el proyecto de la biblioteca
 *      (compartiselo como lector).
 *    - Las bibliotecas hacen un poco más lenta cada ejecución: para código
 *      que se llama muchísimo, a veces conviene copiarlo.
 *    - Funciones que usen SpreadsheetApp.getActiveSpreadsheet() actúan
 *      sobre la planilla del proyecto que LLAMA, no la de la biblioteca.
 *      Por eso estas funciones son "puras": solo calculan.
 * ============================================================================
 */

/**
 * Formatea un monto como en Argentina: 1878.3 -> "$ 1.878,30".
 * @param {number} monto
 * @returns {string}
 */
function formatearMontoArgentino(monto) {
  return formatearMonto_(monto);
}

/**
 * Texto sin acentos, en minúsculas y sin espacios de más.
 * @param {string} texto
 * @returns {string}
 */
function normalizarParaComparar(texto) {
  return normalizarTexto_(texto);
}

/**
 * ¿El texto tiene forma de email?
 * @param {string} texto
 * @returns {boolean}
 */
function esEmailValido(texto) {
  return pareceEmail_(texto);
}

/**
 * Días de calendario entre dos fechas.
 * @param {Date} desde
 * @param {Date} hasta
 * @returns {number}
 */
function diasEntreFechas(desde, hasta) {
  return diasEntre_(desde, hasta);
}

/**
 * Hash SHA-256 de un texto, en hexadecimal.
 * @param {string} texto
 * @returns {string}
 */
function hashSha256(texto) {
  return sha256Hex_(texto);
}
