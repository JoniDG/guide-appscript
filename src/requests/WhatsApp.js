/**
 * ============================================================================
 *  REQUESTS 4: EJEMPLO REAL, MANDAR UN WHATSAPP CON LA API DE META
 * ============================================================================
 *
 *  Un ejemplo completo de integración con una API real: la "WhatsApp Cloud
 *  API" de Meta, para mandar mensajes desde un número de WhatsApp Business.
 *
 *  Qué hace falta (se configura en https://developers.facebook.com):
 *    1. Una app de Meta con el producto "WhatsApp".
 *    2. El "Phone number ID" del número que envía (no es el número de
 *       teléfono: es un ID que muestra Meta).
 *    3. Un token de acceso (temporal para pruebas, o permanente de un
 *       "usuario del sistema" para producción).
 *
 *  Configuración en las Propiedades del script (ver config/Config.js):
 *    WHATSAPP_TOKEN            -> el token de acceso
 *    WHATSAPP_PHONE_NUMBER_ID  -> el Phone number ID
 *    WHATSAPP_API_VERSION      -> opcional, ej: "v23.0". Meta saca versiones
 *                                 nuevas varias veces por año y retira las
 *                                 viejas: revisá la última en el "changelog"
 *                                 de la Graph API.
 *
 *  Límites importantes de WhatsApp (no de Apps Script):
 *    - Solo se puede mandar texto libre a alguien que te escribió en las
 *      últimas 24 horas. Para iniciar una conversación hay que usar una
 *      PLANTILLA aprobada por Meta (enviarPlantillaWhatsApp_).
 *    - En modo de prueba, solo se puede mandar a números agregados como
 *      destinatarios de prueba en la app de Meta.
 *    - El número de destino va en formato internacional, sin espacios
 *      (el "+" es opcional): 5491122334455.
 *    - Números de Argentina: si Meta responde el error 131030 ("número no
 *      está en la lista permitida") con un número que sí agregaste, probá
 *      con y sin el 9 después del 54: Meta a veces los guarda distinto.
 * ============================================================================
 */

/**
 * Manda un pedido a la API de WhatsApp y devuelve la respuesta interpretada.
 * Tira un error con el mensaje de Meta si algo sale mal.
 *
 * @param {Object} mensaje  El cuerpo del mensaje según la API de Meta.
 * @returns {Object}        La respuesta de Meta (incluye el ID del mensaje).
 */
function llamarApiWhatsApp_(mensaje) {
  const token = getConfig_("WHATSAPP_TOKEN");
  const phoneNumberId = getConfig_("WHATSAPP_PHONE_NUMBER_ID");
  const version =
    PropertiesService.getScriptProperties().getProperty(
      "WHATSAPP_API_VERSION",
    ) ?? "v23.0";

  const respuesta = pedirJson_(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ messaging_product: "whatsapp", ...mensaje }),
    },
  );

  if (!respuesta.ok) {
    // Meta explica el error en body.error.message, y muchas veces el detalle
    // útil está en body.error.error_data.details: mostramos los dos.
    const error = respuesta.body?.error;
    const detalle = error
      ? `${error.message}${error.error_data?.details ? ` (${error.error_data.details})` : ""}`
      : JSON.stringify(respuesta.body);
    throw new Error(`WhatsApp respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.body;
}

/**
 * Manda un mensaje de texto libre (solo a quien te escribió en las últimas
 * 24 horas).
 *
 * @param {string} destino  Número en formato internacional, ej: "5491122334455".
 * @param {string} texto
 * @returns {Object}
 */
function enviarTextoWhatsApp_(destino, texto) {
  return llamarApiWhatsApp_({
    recipient_type: "individual",
    to: destino,
    type: "text",
    text: { preview_url: false, body: texto },
  });
}

/**
 * Manda un mensaje usando una plantilla aprobada por Meta (la única forma
 * de iniciar una conversación). "hello_world" es la plantilla de ejemplo
 * que Meta crea en todas las cuentas nuevas.
 *
 * @param {string} destino
 * @param {string} nombrePlantilla
 * @param {string} idioma  Código de idioma de la plantilla, ej: "en_US", "es_AR".
 * @returns {Object}
 */
function enviarPlantillaWhatsApp_(destino, nombrePlantilla, idioma) {
  return llamarApiWhatsApp_({
    to: destino,
    type: "template",
    template: { name: nombrePlantilla, language: { code: idioma } },
  });
}

/**
 * DEMO: manda la plantilla "hello_world" al número guardado en la
 * propiedad WHATSAPP_DEMO_DESTINO. Requiere la configuración de arriba
 * (setup() NO la crea: hay que agregarla a mano en Configuración del
 * proyecto > Propiedades del script).
 */
function demo_enviarWhatsApp() {
  // Revisamos TODAS las propiedades necesarias de una vez, así el error
  // dice todo lo que falta en lugar de ir de a una.
  const props = PropertiesService.getScriptProperties();
  const necesarias = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_DEMO_DESTINO"];
  const faltan = necesarias.filter((nombre) => props.getProperty(nombre) === null);
  if (faltan.length > 0) {
    throw new Error(
      `Faltan estas Propiedades del script: ${faltan.join(", ")}. ` +
        `Agregalas en Configuración del proyecto > Propiedades del script.`,
    );
  }
  const destino = getConfig_("WHATSAPP_DEMO_DESTINO");
  const resultado = enviarPlantillaWhatsApp_(destino, "hello_world", "en_US");
  // Meta devuelve el ID del mensaje: sirve para seguir su estado (entregado,
  // leído) con webhooks.
  console.log("Mensaje enviado. ID:", resultado.messages[0].id);
}
