/**
 * ============================================================================
 *  AVANZADO 5: TESTS (PROBAR EL CÓDIGO AUTOMÁTICAMENTE)
 * ============================================================================
 *
 *  Un TEST es código que prueba otro código: "si le paso 1878.3 a
 *  formatearMonto_, tiene que devolver '$ 1.878,30'". Se escriben una vez y
 *  se corren cada vez que se cambia algo, para enterarse ENSEGUIDA si se
 *  rompió algo que andaba (y no cuando lo nota un usuario).
 *
 *  Apps Script no trae un sistema de tests, así que armamos uno mínimo:
 *    - prueba_(nombre, funcion): registra una prueba.
 *    - assertIgual_(real, esperado): falla si no son iguales.
 *    - assertTira_(funcion, texto): falla si la función NO tira un error
 *      con ese texto.
 *    - runAllTests(): corre todas y muestra el resumen. Si alguna falla,
 *      la ejecución termina en error (así se nota en el panel Ejecuciones,
 *      y si la corrés con un trigger diario, Google te avisa por mail).
 *
 *  Además, las funciones que NO usan servicios de Google (formatear,
 *  normalizar, validar, rutear...) se pueden probar en la compu, sin
 *  internet, con "npm test" (ver la carpeta tests/ del repo). Es mucho más
 *  rápido para el día a día. Las que sí usan Google (Utilities, la
 *  planilla) se prueban acá.
 *
 *  Buenas prácticas:
 *    - Probar los casos normales Y los bordes: vacío, negativo, texto con
 *      acentos, valores inválidos.
 *    - Un test no tiene que depender de otro, ni de datos que cambian.
 *    - Los tests que modifican datos, que limpien lo que crean.
 * ============================================================================
 */

/**
 * Compara dos valores (también objetos y listas, comparando su JSON).
 * @param {*} real
 * @param {*} esperado
 * @param {string} [mensaje]
 */
function assertIgual_(real, esperado, mensaje = "") {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    throw new Error(
      `${mensaje ? `${mensaje}: ` : ""}se esperaba ${b} y llegó ${a}`,
    );
  }
}

/**
 * Falla si "funcion" NO tira un error cuyo mensaje contenga "texto".
 * @param {Function} funcion
 * @param {string} texto
 */
function assertTira_(funcion, texto) {
  try {
    funcion();
  } catch (error) {
    if (!String(error.message).includes(texto)) {
      throw new Error(
        `tiró "${error.message}", se esperaba un error con "${texto}"`,
      );
    }
    return;
  }
  throw new Error(`no tiró ningún error (se esperaba uno con "${texto}")`);
}

/**
 * La lista de pruebas. Está en una función (y no suelta) por el orden de
 * carga de los archivos (ver backend/Router.js, rutas_).
 *
 * @returns {Array<{nombre: string, funcion: Function}>}
 */
function pruebas_() {
  const pruebas = [];
  const prueba_ = (nombre, funcion) => pruebas.push({ nombre, funcion });

  prueba_("formatearMonto_ con miles, decimales y negativos", () => {
    assertIgual_(formatearMonto_(1878.3), "$ 1.878,30");
    assertIgual_(formatearMonto_(1234567.891), "$ 1.234.567,89");
    assertIgual_(formatearMonto_(-50), "-$ 50,00");
    assertTira_(() => formatearMonto_("abc"), "Monto inválido");
  });

  prueba_("normalizarTexto_ y pareceEmail_", () => {
    assertIgual_(normalizarTexto_("  José   PÉREZ "), "jose perez");
    assertIgual_(pareceEmail_("ana@example.com"), true);
    assertIgual_(pareceEmail_("ana@"), false);
  });

  prueba_("fechas: leerFecha_ y diasEntre_ (usa Utilities)", () => {
    const desde = leerFecha_("14/10/2025", "dd/MM/yyyy");
    const hasta = leerFecha_("14/10/2026", "dd/MM/yyyy");
    assertIgual_(diasEntre_(desde, hasta), 365);
    assertIgual_(
      formatearFecha_(sumarDias_(desde, 30), "dd/MM/yyyy"),
      "13/11/2025",
    );
  });

  prueba_("hash: SHA-256 y HMAC contra valores de referencia conocidos", () => {
    // Vectores de prueba publicados (FIPS 180-2 y RFC 4231): si nuestro
    // código da lo mismo, está bien implementado.
    assertIgual_(
      sha256Hex_("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    assertIgual_(
      hmacSha256Hex_("what do ya want for nothing?", "Jefe"),
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  prueba_("router: rutas, parámetros, 404 y 405", () => {
    assertIgual_(buscarRuta_("GET", "clientes/C00001").params, {
      id: "C00001",
    });
    assertTira_(() => buscarRuta_("GET", "productos"), "No existe la ruta");
    assertTira_(() => buscarRuta_("PUT", "clientes/C1"), "no permitido");
  });

  prueba_("validarCliente_ junta todos los errores", () => {
    assertTira_(
      () => validarCliente_({ nombre: "A", email: "x" }, false),
      "nombre",
    );
    assertIgual_(validarCliente_({ monto: 5 }, true), { monto: 5 });
  });

  prueba_(
    // Esta prueba depende de los datos de ejemplo (que exista C00001): si
    // borraste ese cliente, va a fallar.
    "API de punta a punta con un pedido simulado (necesita el cliente C00001)",
    () => {
      const respuesta = JSON.parse(
        doGet(eventoSimulado_("clientes/C00001")).getContent(),
      );
      assertIgual_(respuesta.ok, true);
      assertIgual_(respuesta.data.id, "C00001");
      const noExiste = JSON.parse(
        doGet(eventoSimulado_("clientes/NOEXISTE")).getContent(),
      );
      assertIgual_(noExiste.status, 404);
    },
  );

  return pruebas;
}

/**
 * Corre todas las pruebas y muestra el resultado. Si alguna falla, termina
 * con error.
 */
function runAllTests() {
  const pruebas = pruebas_();
  const fallas = [];
  for (const { nombre, funcion } of pruebas) {
    try {
      funcion();
      console.log(`OK    ${nombre}`);
    } catch (error) {
      fallas.push(`${nombre}: ${error.message}`);
      console.error(`FALLA ${nombre}: ${error.message}`);
    }
  }
  const total = pruebas.length;
  const resumen = `${total - fallas.length} de ${total} pruebas OK.`;
  avisarSiSePuede_(
    fallas.length === 0
      ? resumen
      : `${resumen}\n\nFallaron:\n${fallas.join("\n")}`,
    true,
  );
  if (fallas.length > 0) {
    throw new Error(`${fallas.length} prueba(s) fallaron`);
  }
}
