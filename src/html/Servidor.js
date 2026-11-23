/**
 * ============================================================================
 *  HTML / UI 4: LAS FUNCIONES QUE LLAMAN LAS VENTANAS (google.script.run)
 * ============================================================================
 *
 *  Estas son las funciones del SERVIDOR que las ventanas HTML llaman con
 *  google.script.run. Por eso:
 *    - Son públicas (no terminan en "_"): si no, el navegador no las ve.
 *    - Empiezan con "ui" para que se note que son para las ventanas.
 *    - Devuelven solo datos "simples" (sin Date: las fechas van como texto).
 *    - Si algo está mal, TIRAN un error con un mensaje claro: le llega a la
 *      ventana, que lo muestra.
 *
 *  Reutilizan la lógica del tema Backend (validarCliente_, crearCliente_,
 *  actualizarCliente_, subirArchivo_): las reglas de negocio están en UN
 *  solo lugar, y las usan tanto la API como las ventanas.
 *
 *  SEGURIDAD: cualquier función pública del proyecto se puede llamar con
 *  google.script.run desde una ventana o página de este proyecto. Dentro
 *  de la planilla solo la usan sus editores, pero en una página web pública
 *  la podría usar cualquiera (ver PaginaWeb.js).
 * ============================================================================
 */

/**
 * Convierte un cliente para mandarlo al navegador: la fecha (Date, que no
 * puede viajar por google.script.run) pasa a texto.
 *
 * @param {Object} cliente
 * @returns {Object}
 */
function clienteParaUi_(cliente) {
  return {
    ...cliente,
    fecha_alta:
      cliente.fecha_alta instanceof Date
        ? formatearFecha_(cliente.fecha_alta, "dd/MM/yyyy")
        : String(cliente.fecha_alta),
  };
}

/**
 * Lee un cliente por número de fila de la hoja Clientes.
 *
 * @param {number} fila
 * @returns {Object}
 */
function clientePorFila_(fila) {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const valores = hoja
    .getRange(fila, 1, 1, CLIENTES_HEADERS.length)
    .getValues()[0];
  return Object.fromEntries(
    CLIENTES_HEADERS.map((campo, i) => [campo, valores[i]]),
  );
}

/**
 * Lista de ciudades distintas que hay en la hoja Clientes, ordenadas. Se
 * usa para armar el desplegable de los formularios.
 *
 * @returns {string[]}
 */
function ciudadesDeClientes_() {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const columna = hoja
    .getRange(2, COL_CLIENTES.ciudad, Math.max(1, hoja.getLastRow() - 1), 1)
    .getValues()
    .flat();
  // new Set(...) elimina los repetidos; [...] lo vuelve a convertir en lista.
  // localeCompare ordena alfabéticamente respetando acentos.
  // map(String): si alguna celda tiene un número, lo pasamos a texto para
  // que localeCompare (que es de los textos) no falle.
  return [...new Set(columna.filter(Boolean).map(String))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

/**
 * Guarda un cliente nuevo (lo llama el formulario de alta).
 * @param {Object} datos  { nombre, email, ciudad, monto, activo }
 * @returns {Object}      El cliente creado.
 */
function uiGuardarCliente(datos) {
  return clienteParaUi_(crearCliente_({ body: datos }).data);
}

/**
 * Modifica un cliente (lo llama el formulario de edición).
 * @param {string} id
 * @param {Object} cambios
 * @returns {Object}  El cliente actualizado.
 */
function uiActualizarCliente(id, cambios) {
  return clienteParaUi_(
    actualizarCliente_({ params: { id }, body: cambios }).data,
  );
}

/**
 * Busca clientes cuyo id, nombre, email o ciudad contenga el texto (sin
 * importar mayúsculas ni acentos). Devuelve los primeros 20, con su número
 * de fila para poder ir a verlos.
 *
 * @param {string} texto
 * @returns {{total: number, resultados: Object[]}}
 */
function uiBuscarClientes(texto) {
  const buscado = normalizarTexto_(texto);
  if (buscado.length < 2) {
    return { total: 0, resultados: [] };
  }
  const filas = getGuideSpreadsheet_()
    .getSheetByName(SHEET_CLIENTES)
    .getDataRange()
    .getValues();
  const resultados = [];
  let total = 0;
  for (let i = 1; i < filas.length; i++) {
    const [id, nombre, email, ciudad, , , activo] = filas[i];
    if (
      normalizarTexto_(`${id} ${nombre} ${email} ${ciudad}`).includes(buscado)
    ) {
      total++;
      if (resultados.length < 20) {
        resultados.push({ fila: i + 1, id, nombre, email, ciudad, activo });
      }
    }
  }
  return { total, resultados };
}

/**
 * Lleva a la persona a una fila de la hoja Clientes y la selecciona
 * (lo llama la barra lateral al hacer clic en un resultado).
 *
 * @param {number} fila
 */
function uiIrAFila(fila) {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  hoja.activate();
  hoja.setActiveRange(hoja.getRange(fila, 1, 1, CLIENTES_HEADERS.length));
}

/**
 * Sube un archivo a Drive (lo llama el modal de subida). Reutiliza las
 * reglas de la API: tipos permitidos, tamaño máximo, nombre limpio.
 *
 * @param {{nombre: string, mimeType: string, contenido: string}} archivo
 * @returns {{nombre: string, url: string, bytes: number}}
 */
function uiSubirArchivo(archivo) {
  const { nombre, url, bytes } = subirArchivo_({ body: archivo }).data;
  return { nombre, url, bytes };
}

/**
 * Muestra un aviso (toast) en la planilla. Lo llaman las ventanas para
 * confirmar una acción antes de cerrarse.
 *
 * @param {string} mensaje
 */
function uiAvisar(mensaje) {
  getGuideSpreadsheet_().toast(String(mensaje), "Guía", 4);
}
