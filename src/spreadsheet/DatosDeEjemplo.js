/**
 * ============================================================================
 *  SPREADSHEET: DATOS DE EJEMPLO
 * ============================================================================
 *
 *  setup() llama a poblarClientesDeEjemplo_ para llenar la hoja "Clientes"
 *  con 5.000 filas de datos INVENTADOS. Sirven para que los demos de
 *  búsqueda y los benchmarks muestren diferencias reales (con 10 filas todo
 *  parece instantáneo).
 *
 *  Los datos son siempre los mismos: usamos un generador de números "al
 *  azar" con semilla fija, así cualquiera que ejecute setup() obtiene la
 *  misma hoja y los ejemplos de la guía (como buscar un email concreto)
 *  funcionan igual para todos.
 * ============================================================================
 */

/** Cantidad de clientes de ejemplo que se generan. */
const CANTIDAD_CLIENTES_EJEMPLO = 5000;

/**
 * Número de columna (empezando en 1, como en la hoja) de cada campo de la
 * hoja "Clientes". Tiene que coincidir con CLIENTES_HEADERS (config/Setup.js).
 * Así escribimos COL_CLIENTES.email en vez de un 3 "mágico" que nadie
 * entiende.
 */
const COL_CLIENTES = {
  id: 1,
  nombre: 2,
  email: 3,
  ciudad: 4,
  fecha_alta: 5,
  monto: 6,
  activo: 7,
};

/**
 * Crea un generador de números pseudoaleatorios con semilla.
 * Con la misma semilla, siempre devuelve la misma secuencia de números.
 * (Math.random() no permite elegir semilla: cada vez da otros números.)
 *
 * @param {number} semilla
 * @returns {() => number}  Una función que devuelve números entre 0 y 1.
 */
function crearAleatorioConSemilla_(semilla) {
  let estado = semilla;
  return () => {
    // Fórmula clásica de "generador congruencial lineal": no hace falta
    // entenderla, solo saber que mezcla bien los números.
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

/**
 * Genera las filas de clientes de ejemplo (sin encabezado).
 *
 * @param {number} cantidad
 * @returns {Array<Array<*>>}
 */
function generarClientesDeEjemplo_(cantidad) {
  const aleatorio = crearAleatorioConSemilla_(42);
  const elegir = (lista) => lista[Math.floor(aleatorio() * lista.length)];

  const nombres = [
    "Ana",
    "Luis",
    "Carla",
    "Bruno",
    "Sofía",
    "Martín",
    "Lucía",
    "Diego",
    "Valentina",
    "Joaquín",
  ];
  const apellidos = [
    "Gómez",
    "Pérez",
    "Rodríguez",
    "Fernández",
    "López",
    "Díaz",
    "Martínez",
    "Sosa",
    "Romero",
    "Álvarez",
  ];
  const ciudades = [
    "Buenos Aires",
    "Córdoba",
    "Rosario",
    "Mendoza",
    "La Plata",
    "Mar del Plata",
    "Salta",
    "Neuquén",
  ];
  const inicio = new Date(2023, 0, 1).getTime();
  const fin = new Date(2026, 9, 31).getTime();

  const filas = [];
  for (let i = 1; i <= cantidad; i++) {
    const nombre = elegir(nombres);
    const apellido = elegir(apellidos);
    // normalizarTexto_ (utils/Texto.js) saca acentos: "Gómez" -> "gomez".
    const email = `${normalizarTexto_(nombre)}.${normalizarTexto_(apellido)}${i}@example.com`;
    const fechaAlta = new Date(inicio + aleatorio() * (fin - inicio));
    // Fecha sin hora (a medianoche): new Date(año, mes, día).
    fechaAlta.setHours(0, 0, 0, 0);

    filas.push([
      // padStart: "7" -> "00007". Queda C00007.
      `C${String(i).padStart(5, "0")}`,
      `${nombre} ${apellido}`,
      email,
      elegir(ciudades),
      fechaAlta,
      Math.round(aleatorio() * 500000) / 100, // monto entre 0 y 5.000 con 2 decimales
      aleatorio() < 0.8, // 80% activos
    ]);
  }
  return filas;
}

/**
 * Llena la hoja "Clientes" con los datos de ejemplo, SOLO si está vacía
 * (tiene únicamente el encabezado). Si ya tiene datos, no hace nada: así
 * setup() se puede ejecutar muchas veces sin duplicar ni borrar nada.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @returns {boolean}  true si cargó los datos.
 */
function poblarClientesDeEjemplo_(hoja) {
  if (hoja.getLastRow() > 1) {
    return false;
  }
  const filas = generarClientesDeEjemplo_(CANTIDAD_CLIENTES_EJEMPLO);

  // Una hoja nueva tiene 1.000 filas. getRange no puede pedir filas que no
  // existen (tira error), así que primero agregamos las que falten.
  const filasNecesarias = filas.length + 1; // +1 por el encabezado
  if (hoja.getMaxRows() < filasNecesarias) {
    hoja.insertRowsAfter(
      hoja.getMaxRows(),
      filasNecesarias - hoja.getMaxRows(),
    );
  }

  // UN solo setValues para 5.000 filas x 7 columnas: tarda un par de
  // segundos. Con appendRow serían 5.000 viajes y varios minutos.
  hoja.getRange(2, 1, filas.length, filas[0].length).setValues(filas);

  // Formato de números de las columnas fecha y monto (ver Formato.js).
  hoja
    .getRange(2, COL_CLIENTES.fecha_alta, filas.length, 1)
    .setNumberFormat("dd/mm/yyyy");
  hoja
    .getRange(2, COL_CLIENTES.monto, filas.length, 1)
    .setNumberFormat("#,##0.00");
  return true;
}
