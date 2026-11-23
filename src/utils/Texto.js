/**
 * ============================================================================
 *  UTILS: TEXTO Y EXPRESIONES REGULARES
 * ============================================================================
 *
 *  Una expresión regular (regex) es un "patrón" para buscar dentro de un
 *  texto. Se escribe entre barras: /patrón/. Algunas piezas básicas:
 *
 *    \d     un dígito (0-9)             \d+    uno o más dígitos
 *    \s     un espacio, tab o salto     .      cualquier caracter
 *    [abc]  una de esas letras          ^ y $  inicio y fin del texto
 *    ( )    "grupo": la parte que queremos extraer
 *    \[ \]  los corchetes literales (con \ adelante, porque [ ] solos
 *           tienen otro significado en una regex)
 *    i al final (/hola/i) -> no distingue mayúsculas de minúsculas
 *    g al final (/\d/g)   -> busca TODAS las coincidencias, no solo la primera
 *
 *  Para probar regex de forma visual: https://regex101.com
 * ============================================================================
 */

/**
 * Extrae el número que está entre corchetes en un texto.
 * Ej: "files[3]" -> 3.  Si no hay, devuelve null.
 *
 * @param {string} texto
 * @returns {number|null}
 */
function numeroEntreCorchetes_(texto) {
  // match devuelve null si no encuentra nada, o una lista donde:
  //   [0] = todo lo que coincidió ("[3]")
  //   [1] = lo que capturó el primer grupo ( ) ("3")
  const coincidencia = texto.match(/\[(\d+)\]/);
  return coincidencia ? Number(coincidencia[1]) : null;
}

/**
 * Deja un texto "normalizado" para comparar: sin espacios de más, en
 * minúsculas y sin acentos. "  José  PÉREZ " -> "jose perez".
 *
 * Útil para buscar en una planilla sin que importe cómo lo escribió cada uno.
 *
 * @param {string} texto
 * @returns {string}
 */
function normalizarTexto_(texto) {
  return (
    String(texto)
      .trim() // saca espacios al principio y al final
      .toLowerCase()
      // normalize("NFD") separa cada letra de su acento ("é" -> "e" + "´");
      // después la regex borra todos los acentos sueltos, que en Unicode
      // ocupan el rango \u0300 a \u036f.
      // Ojo: la ñ también se separa en "n" + "~", así que "año" y "ano"
      // quedan iguales. Para comparar nombres suele estar bien; si en tu
      // caso la ñ importa, no uses esta función.
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // varios espacios, tabs o saltos de línea seguidos -> un solo espacio
      .replace(/\s+/g, " ")
  );
}

/**
 * Valida (de forma simple) que un texto tenga forma de email.
 * No garantiza que el email exista; solo que "parece" un email.
 *
 * @param {string} texto
 * @returns {boolean}
 */
function pareceEmail_(texto) {
  // algo SIN espacios ni @, una @, algo, un punto, algo.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}

/**
 * DEMO: ejemplos de cada función de texto.
 */
function demo_texto() {
  console.log(numeroEntreCorchetes_("files[3]")); // 3
  console.log(numeroEntreCorchetes_("sin corchetes")); // null

  console.log(normalizarTexto_("  José   PÉREZ  ")); // "jose perez"
  console.log(normalizarTexto_("Ñandú") === normalizarTexto_("ñandu")); // true

  console.log(pareceEmail_("ana@example.com")); // true
  console.log(pareceEmail_("ana@example")); // false

  // Extraer TODOS los números de un texto: la "g" busca todas las
  // coincidencias, y match devuelve la lista de todas.
  console.log("Pedidos 15, 27 y 103".match(/\d+/g)); // ["15", "27", "103"]

  // Reemplazar con una regex: ocultar todos los dígitos menos los últimos 4.
  // (?=\d{4}) significa "seguido de 4 dígitos", sin incluirlos en el reemplazo.
  console.log("1234567890".replace(/\d(?=\d{4})/g, "*")); // "******7890"
}
