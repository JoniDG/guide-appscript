/**
 * ============================================================================
 *  BACKEND 3: CRUD DE CLIENTES (LA HOJA COMO BASE DE DATOS)
 * ============================================================================
 *
 *  "CRUD" son las 4 operaciones básicas sobre datos:
 *    Create (crear), Read (leer), Update (actualizar), Delete (borrar).
 *  Acá las implementamos sobre la hoja "Clientes", usando los helpers del
 *  tema Spreadsheet (hojaAObjetos_, agregarObjetos_, actualizarPorId_...).
 *
 *  Cada "handler" recibe el pedido ya interpretado por el router:
 *    { metodo, ruta, params, query, body }
 *  y devuelve { status, data }. Si algo está mal, tira un HttpError_.
 *
 *  VALIDAR TODO LO QUE LLEGA: un backend nunca confía en los datos que
 *  recibe. Pueden venir de un formulario mal hecho o de alguien que quiere
 *  romper el sistema. Cada campo se revisa (tipo, formato, rango) antes de
 *  guardarlo.
 *
 *  CONCURRENCIA: si dos pedidos llegan AL MISMO TIEMPO, pueden pisarse:
 *  dos altas calcularían el mismo "próximo ID", o un borrado movería las
 *  filas mientras otro pedido está modificando una. Por eso todo lo que
 *  ESCRIBE se hace dentro de un "candado" (LockService): de a un pedido por
 *  vez. Lo vemos en detalle en el tema Estado.
 *
 *  FECHAS EN EL JSON: un Date se convierte en texto ISO en hora UTC, por
 *  ejemplo "2026-11-23T03:00:00.000Z" (la Z significa UTC). En Argentina
 *  (UTC-3) esa es la medianoche del 23/11. Quien lo reciba lo convierte a
 *  su zona horaria.
 * ============================================================================
 */

/** Campos que se pueden modificar desde la API (el id no). */
const CAMPOS_EDITABLES_CLIENTE = [
  "nombre",
  "email",
  "ciudad",
  "monto",
  "activo",
];

/** Campos del cuerpo que son "del pedido" y no del cliente. */
const CAMPOS_DEL_PEDIDO = ["token", "_method"];

/**
 * Ejecuta "tarea" con el candado del script tomado, y lo libera al final.
 * Si en 10 segundos no se libera (hay mucho tráfico), responde 503
 * ("servicio no disponible, reintentá") en vez de un error genérico.
 *
 * @param {Function} tarea
 * @returns {*}  Lo que devuelva la tarea.
 */
function conCandado_(tarea) {
  const lock = LockService.getScriptLock();
  // tryLock espera hasta 10 segundos y devuelve true si consiguió el
  // candado, false si no (waitLock, en cambio, tiraría un error).
  if (!lock.tryLock(10000)) {
    throw new HttpError_(
      503,
      "El servidor está ocupado, reintentá en unos segundos",
    );
  }
  try {
    return tarea();
  } finally {
    // finally: liberamos el candado SIEMPRE, aunque haya habido un error.
    lock.releaseLock();
  }
}

/**
 * Valida los campos de un cliente. Con "parcial" = true (para PATCH) solo
 * valida los campos que vinieron; si no, exige nombre y email.
 *
 * @param {Object} datos
 * @param {boolean} parcial
 * @returns {Object}  Solo los campos permitidos, ya limpios.
 */
function validarCliente_(datos, parcial) {
  const errores = [];
  const limpio = {};

  for (const campo of Object.keys(datos)) {
    if (
      !CAMPOS_EDITABLES_CLIENTE.includes(campo) &&
      !CAMPOS_DEL_PEDIDO.includes(campo)
    ) {
      errores.push(`campo desconocido: ${campo}`);
    }
  }

  if (!parcial || "nombre" in datos) {
    if (typeof datos.nombre !== "string" || datos.nombre.trim().length < 2) {
      errores.push("nombre: obligatorio, al menos 2 letras");
    } else {
      limpio.nombre = datos.nombre.trim();
    }
  }
  if (!parcial || "email" in datos) {
    if (typeof datos.email !== "string" || !pareceEmail_(datos.email)) {
      errores.push("email: obligatorio y con formato de email");
    } else {
      limpio.email = datos.email.trim().toLowerCase();
    }
  }
  if ("ciudad" in datos) {
    if (typeof datos.ciudad !== "string") {
      errores.push("ciudad: tiene que ser texto");
    } else {
      limpio.ciudad = datos.ciudad.trim();
    }
  }
  if ("monto" in datos) {
    if (
      typeof datos.monto !== "number" ||
      !Number.isFinite(datos.monto) ||
      datos.monto < 0
    ) {
      errores.push("monto: tiene que ser un número mayor o igual a 0");
    } else {
      limpio.monto = datos.monto;
    }
  }
  if ("activo" in datos) {
    if (typeof datos.activo !== "boolean") {
      errores.push("activo: tiene que ser true o false");
    } else {
      limpio.activo = datos.activo;
    }
  }

  if (errores.length > 0) {
    // 400 = "el pedido está mal". Devolvemos TODOS los errores juntos, así
    // quien llama los puede corregir de una vez.
    throw new HttpError_(400, `Datos inválidos: ${errores.join("; ")}`);
  }
  return limpio;
}

/**
 * Busca un cliente por id o tira 404.
 *
 * @param {string} id
 * @returns {Object}
 */
function buscarClienteOFallar_(id) {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const fila = buscarNumeroDeFila_(hoja, COL_CLIENTES.id, id);
  if (fila === -1) {
    throw new HttpError_(404, `No existe el cliente ${id}`);
  }
  const valores = hoja
    .getRange(fila, 1, 1, CLIENTES_HEADERS.length)
    .getValues()[0];
  return Object.fromEntries(
    CLIENTES_HEADERS.map((campo, i) => [campo, valores[i]]),
  );
}

/**
 * Convierte un parámetro de la URL en un entero dentro de un rango. Si no
 * viene o no es un número válido, usa el valor por defecto.
 *
 * @param {string|undefined} valor
 * @param {number} porDefecto
 * @param {number} minimo
 * @param {number} maximo
 * @returns {number}
 */
function enteroEnRango_(valor, porDefecto, minimo, maximo) {
  const numero = Math.floor(Number(valor));
  if (valor === undefined || valor === "" || !Number.isFinite(numero)) {
    return porDefecto;
  }
  return Math.min(maximo, Math.max(minimo, numero));
}

/**
 * GET /clientes?ciudad=Salta&activo=true&pagina=2&limite=10
 * Lista clientes con filtros opcionales y paginación.
 *
 * PAGINACIÓN: en vez de devolver 5.000 clientes de golpe (lento y pesado),
 * se devuelven de a "páginas". El cliente pide la página 1, después la 2...
 * Junto con los datos devolvemos el total, para saber cuántas páginas hay.
 */
function listarClientes_(pedido) {
  const { ciudad, activo } = pedido.query;
  const pagina = enteroEnRango_(pedido.query.pagina, 1, 1, 100000);
  const limite = enteroEnRango_(pedido.query.limite, 20, 1, 100);

  let clientes = hojaAObjetos_(
    getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES),
  );
  if (ciudad) {
    // Comparamos normalizado: "cordoba" encuentra "Córdoba".
    clientes = clientes.filter(
      (c) => normalizarTexto_(c.ciudad) === normalizarTexto_(ciudad),
    );
  }
  if (activo === "true" || activo === "false") {
    clientes = clientes.filter((c) => c.activo === (activo === "true"));
  }

  const inicio = (pagina - 1) * limite;
  return {
    status: 200,
    data: {
      total: clientes.length,
      pagina,
      limite,
      paginas: Math.ceil(clientes.length / limite),
      clientes: clientes.slice(inicio, inicio + limite),
    },
  };
}

/** GET /clientes/:id */
function obtenerCliente_(pedido) {
  return { status: 200, data: buscarClienteOFallar_(pedido.params.id) };
}

/**
 * POST /clientes  (requiere token)
 * Cuerpo: { "token": "...", "nombre": "...", "email": "...", "ciudad": "...", "monto": 0 }
 */
function crearCliente_(pedido) {
  const datos = validarCliente_(pedido.body, false);
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);

  return conCandado_(() => {
    if (buscarNumeroDeFila_(hoja, COL_CLIENTES.email, datos.email) !== -1) {
      // 409 = "conflicto": ya existe algo que choca con lo que se quiere crear.
      throw new HttpError_(
        409,
        `Ya existe un cliente con el email ${datos.email}`,
      );
    }
    const cliente = {
      id: siguienteIdDeCliente_(hoja),
      ciudad: "",
      monto: 0,
      activo: true,
      ...datos,
      fecha_alta: new Date(),
    };
    agregarObjetos_(hoja, [cliente]);
    // 201 = "creado". Devolvemos el cliente completo, con su ID nuevo.
    return { status: 201, data: cliente };
  });
}

/**
 * Calcula el próximo ID: el número más alto que exista + 1.
 * "C05000" -> "C05001". Llamar solo con el candado tomado.
 *
 * Limitación: si se borra el cliente con el ID más alto, el próximo alta
 * REUSA ese ID. Si eso importa (por ejemplo, porque otro sistema guardó el
 * ID viejo), hay que guardar el último número usado aparte (en las
 * Propiedades del script) en lugar de calcularlo.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} hoja
 * @returns {string}
 */
function siguienteIdDeCliente_(hoja) {
  const filasDeDatos = hoja.getLastRow() - 1;
  if (filasDeDatos < 1) {
    return "C00001";
  }
  const ids = hoja
    .getRange(2, COL_CLIENTES.id, filasDeDatos, 1)
    .getValues()
    .flat();
  const maximo = ids.reduce(
    (max, id) => Math.max(max, Number(String(id).slice(1)) || 0),
    0,
  );
  return `C${String(maximo + 1).padStart(5, "0")}`;
}

/**
 * PATCH /clientes/:id  (requiere token)
 * Cuerpo: el token y solo los campos que cambian, ej:
 *   { "token": "...", "_method": "PATCH", "ciudad": "Salta" }
 */
function actualizarCliente_(pedido) {
  const cambios = validarCliente_(pedido.body, true);
  if (Object.keys(cambios).length === 0) {
    throw new HttpError_(400, "No hay campos para actualizar");
  }
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  const { id } = pedido.params;

  conCandado_(() => {
    // Si cambia el email, que no choque con el de OTRO cliente.
    if (cambios.email) {
      const filaConEseEmail = buscarNumeroDeFila_(
        hoja,
        COL_CLIENTES.email,
        cambios.email,
      );
      const filaDelCliente = buscarNumeroDeFila_(hoja, COL_CLIENTES.id, id);
      if (filaConEseEmail !== -1 && filaConEseEmail !== filaDelCliente) {
        throw new HttpError_(
          409,
          `Ya existe otro cliente con el email ${cambios.email}`,
        );
      }
    }
    if (!actualizarPorId_(hoja, "id", id, cambios)) {
      throw new HttpError_(404, `No existe el cliente ${id}`);
    }
  });
  return { status: 200, data: buscarClienteOFallar_(id) };
}

/**
 * DELETE /clientes/:id  (requiere token)
 * Cuerpo: { "token": "...", "_method": "DELETE" }
 */
function borrarCliente_(pedido) {
  const hoja = getGuideSpreadsheet_().getSheetByName(SHEET_CLIENTES);
  conCandado_(() => {
    // Buscamos la fila DENTRO del candado: si otro pedido borrara una fila
    // de arriba mientras tanto, el número de fila cambiaría.
    const fila = buscarNumeroDeFila_(hoja, COL_CLIENTES.id, pedido.params.id);
    if (fila === -1) {
      throw new HttpError_(404, `No existe el cliente ${pedido.params.id}`);
    }
    hoja.deleteRow(fila);
  });
  return { status: 200, data: { borrado: pedido.params.id } };
}
