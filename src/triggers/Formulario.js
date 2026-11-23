/**
 * ============================================================================
 *  TRIGGERS 4: GOOGLE FORMS + TRIGGER "AL ENVIAR FORMULARIO"
 * ============================================================================
 *
 *  Un caso clásico: un Google Form (que puede llenar cualquiera, sin acceso
 *  a la planilla) cuyas respuestas llegan a la planilla, y un trigger que
 *  procesa cada respuesta apenas llega.
 *
 *  demo_crearFormularioDeAlta hace TODO por código:
 *    1. Crea un Google Form "Alta de cliente" con preguntas y validaciones
 *       (FormApp).
 *    2. Lo conecta a esta planilla: las respuestas se guardan en una hoja
 *       nueva, "Respuestas de formulario 1" (el nombre lo pone Google).
 *    3. Instala un trigger onFormSubmit que, con cada respuesta, da de alta
 *       el cliente en la hoja Clientes, usando las MISMAS validaciones que
 *       la API y los formularios del tema HTML (crearCliente_).
 *
 *  El objeto "e" de onFormSubmit (en la planilla):
 *    e.namedValues -> { "Nombre": ["Ana"], "Email": ["ana@..."], ... }
 *                     (por título de pregunta; cada valor es una LISTA)
 *    e.values      -> los valores en orden de columna (el primero es la
 *                     fecha y hora de la respuesta)
 *    e.range       -> la fila de la hoja de respuestas donde se guardó
 *
 *  Validar en el FORMULARIO (requireTextIsEmail, etc.) ayuda a quien lo
 *  llena, pero el trigger igual valida: los datos podrían venir mal de
 *  otra forma (por ejemplo, si alguien edita el formulario y saca una
 *  validación).
 * ============================================================================
 */

/** Títulos de las preguntas (se usan para leer e.namedValues). */
const PREGUNTAS_ALTA = {
  nombre: "Nombre y apellido",
  email: "Email",
  ciudad: "Ciudad",
  monto: "Monto",
};

/**
 * DEMO: crea el formulario, lo conecta a la planilla e instala el trigger.
 * Si ya existe (propiedad FORM_ID), solo muestra sus links.
 */
function demo_crearFormularioDeAlta() {
  const props = PropertiesService.getScriptProperties();
  const idGuardado = props.getProperty("FORM_ID");
  if (idGuardado) {
    try {
      if (!DriveApp.getFileById(idGuardado).isTrashed()) {
        // Ya existe: nos aseguramos de que el trigger esté instalado (pudo
        // haberse borrado con "Desinstalar triggers") y mostramos los links.
        instalarTriggerDelFormulario_();
        mostrarLinksDelFormulario_(FormApp.openById(idGuardado));
        return;
      }
    } catch (error) {
      // El formulario ya no existe: lo creamos de nuevo.
    }
  }

  const planilla = getGuideSpreadsheet_();
  const form = FormApp.create("Guía Apps Script - Alta de cliente");
  form.setDescription(
    "Formulario de ejemplo de la Guía de Apps Script. Cada respuesta crea un cliente.",
  );

  form.addTextItem().setTitle(PREGUNTAS_ALTA.nombre).setRequired(true);
  form
    .addTextItem()
    .setTitle(PREGUNTAS_ALTA.email)
    .setRequired(true)
    // Validación en el formulario: no deja enviar algo que no sea un email.
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form
    .addListItem()
    .setTitle(PREGUNTAS_ALTA.ciudad)
    // Si la hoja Clientes estuviera vacía no habría ciudades: usamos una
    // opción genérica para no dejar la pregunta sin opciones.
    .setChoiceValues(ciudadesDeClientes_().length > 0 ? ciudadesDeClientes_() : ["Otra"])
    .setRequired(true);
  form
    .addTextItem()
    .setTitle(PREGUNTAS_ALTA.monto)
    .setHelpText("Un número, sin el signo $")
    .setValidation(
      FormApp.createTextValidation()
        .requireNumberGreaterThanOrEqualTo(0)
        .setHelpText("Tiene que ser un número mayor o igual a 0")
        .build(),
    );

  // Conectar las respuestas a esta planilla.
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilla.getId());

  // FormApp.create lo deja en la raíz de Drive: lo movemos a la carpeta de
  // la guía.
  DriveApp.getFileById(form.getId()).moveTo(getGuideFolder_());
  props.setProperty("FORM_ID", form.getId());

  instalarTriggerDelFormulario_();

  registrar_(
    "demo_crearFormularioDeAlta",
    `Formulario creado: ${form.getPublishedUrl()}`,
  );
  mostrarLinksDelFormulario_(form);
}

/**
 * Instala (o reinstala, sin duplicar) el trigger "al enviar formulario".
 *
 * Ojo: este trigger se dispara con las respuestas de CUALQUIER formulario
 * conectado a esta planilla, no solo el de la guía. Y la comunidad reporta
 * que, muy de vez en cuando, se dispara dos veces para una misma
 * respuesta: si pasa, el segundo intento queda como "email repetido" en el
 * registro, sin crear un cliente duplicado.
 */
function instalarTriggerDelFormulario_() {
  borrarTriggersDe_(["alEnviarFormulario"]);
  ScriptApp.newTrigger("alEnviarFormulario").forSpreadsheet(getGuideSpreadsheet_()).onFormSubmit().create();
}

/**
 * Muestra el link para responder y el link para editar el formulario.
 * @param {GoogleAppsScript.Forms.Form} form
 */
function mostrarLinksDelFormulario_(form) {
  const texto =
    `Formulario listo.\n\nPara responder (compartible): ${form.getPublishedUrl()}\n\n` +
    `Para editarlo: ${form.getEditUrl()}`;
  console.log(texto);
  avisarSiSePuede_(texto, true);
}

/**
 * TRIGGER al enviar el formulario: crea el cliente.
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function alEnviarFormulario(e) {
  // namedValues trae listas: [0] es la respuesta.
  const respuesta = (titulo) => (e.namedValues[titulo] || [""])[0].trim();
  const montoTexto = respuesta(PREGUNTAS_ALTA.monto).replace(",", ".");

  const datos = {
    nombre: respuesta(PREGUNTAS_ALTA.nombre),
    email: respuesta(PREGUNTAS_ALTA.email),
    ciudad: respuesta(PREGUNTAS_ALTA.ciudad),
    // Pregunta opcional: si quedó vacía, monto 0.
    monto: montoTexto === "" ? 0 : Number(montoTexto),
  };

  try {
    const { data } = crearCliente_({ body: datos });
    registrar_(
      "alEnviarFormulario",
      `Cliente ${data.id} creado desde el formulario (${data.email})`,
    );
  } catch (error) {
    // Si falla (email repetido, dato inválido), queda registrado. La
    // respuesta igual queda guardada en la hoja de respuestas.
    registrar_("alEnviarFormulario", `No se creó el cliente: ${error.message}`);
  }
}

/**
 * DEMO: deshace todo lo que hizo demo_crearFormularioDeAlta: borra el
 * trigger, desconecta el formulario, lo manda a la papelera y borra la
 * hoja de respuestas.
 */
function demo_borrarFormularioDeAlta() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("FORM_ID");
  borrarTriggersDe_(["alEnviarFormulario"]);
  if (!id) {
    avisarSiSePuede_("No hay formulario creado.");
    return;
  }

  const planilla = getGuideSpreadsheet_();

  // 1) Buscamos la hoja de respuestas ANTES de desconectar el formulario:
  //    mientras está conectada, la hoja "recuerda" la URL de su formulario
  //    (getFormUrl). La comparamos por el ID del formulario.
  const hojasDeRespuestas = planilla.getSheets().filter((hoja) => {
    const url = hoja.getFormUrl();
    if (!url) {
      return false;
    }
    try {
      return FormApp.openByUrl(url).getId() === id;
    } catch (error) {
      return false;
    }
  });

  // 2) Desconectamos y mandamos el formulario a la papelera. Si alguien ya
  //    lo borró a mano, openById falla: seguimos igual con la limpieza.
  try {
    FormApp.openById(id).removeDestination();
    DriveApp.getFileById(id).setTrashed(true);
  } catch (error) {
    registrar_("demo_borrarFormularioDeAlta", `El formulario ya no existía: ${error.message}`);
  }

  // 3) Borramos la hoja de respuestas (ya desconectada).
  hojasDeRespuestas.forEach((hoja) => planilla.deleteSheet(hoja));

  props.deleteProperty("FORM_ID");
  registrar_(
    "demo_borrarFormularioDeAlta",
    `Formulario y trigger borrados. Hojas de respuestas borradas: ${hojasDeRespuestas.length}.`,
  );
  avisarSiSePuede_("Formulario borrado.");
}
