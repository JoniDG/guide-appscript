/**
 * ============================================================================
 *  DOCS Y MAIL 1: MANDAR MAILS (CON HTML Y CSS QUE FUNCIONE)
 * ============================================================================
 *
 *  Dos servicios mandan mails:
 *    MailApp  -> SOLO manda. Pide un permiso chico ("enviar mails como vos").
 *                (En ESTE proyecto la autorización igual incluye Gmail
 *                completo, porque Gmail.js usa GmailApp: ver ese archivo.)
 *    GmailApp -> manda, pero además LEE tu casilla, busca, etiqueta, borra...
 *                Pide acceso completo a tu Gmail (ver Gmail.js).
 *  Para solo mandar, usá MailApp.
 *
 *  MailApp.sendEmail({ ...opciones }):
 *    to, cc, bcc   -> destinatarios (varios: separados por coma)
 *    subject       -> asunto
 *    body          -> versión en TEXTO PLANO (siempre conviene mandarla)
 *    htmlBody      -> versión con formato (HTML)
 *    attachments   -> lista de Blobs (PDF, imágenes... ver drive/Blobs.js)
 *    inlineImages  -> imágenes INCRUSTADAS: { logo: blob } y en el HTML
 *                     <img src="cid:logo">
 *    name          -> el nombre que ve el destinatario ("Guía Apps Script")
 *    replyTo       -> a qué dirección van las respuestas
 *  El mail sale DESDE la cuenta que ejecuta el script.
 *
 *  CUOTA: 100 destinatarios por día en cuentas gratuitas (1.500 en
 *  Workspace). Cada destinatario cuenta (un mail a 3 personas gasta 3).
 *  MailApp.getRemainingDailyQuota() dice cuántos te quedan.
 *
 *  SEGURIDAD MIENTRAS SE PRUEBA: todos los demos mandan SOLO a tu propio
 *  email (destinatarioDePrueba_). Un error común es probar con datos
 *  reales y mandarle 500 mails a clientes de verdad.
 *
 *  CSS EN LOS MAILS: NO ES COMO EN UNA PÁGINA WEB
 *  Cada programa de correo (Gmail, Outlook, Apple Mail, el celular) muestra
 *  el HTML a su manera, y muchos ignoran gran parte del CSS. Las reglas
 *  que funcionan en todos lados:
 *    - Estilos EN LÍNEA: <p style="color: #202124">. Algunos programas
 *      borran o ignoran los bloques <style> (Gmail los acepta, pero descarta
 *      el bloque entero si tiene un error, y en algunos casos no los
 *      aplica), y los programas más usados (Gmail, Outlook) no cargan hojas
 *      de estilo externas (<link>).
 *    - Diseño con TABLAS (<table>), no con flexbox ni grid.
 *    - Ancho máximo ~600 px, centrado. Con el atributo width="600" Y el
 *      CSS max-width: Outlook de escritorio ignora max-width y usa el
 *      atributo; el resto usa el CSS (y se achica en el celular).
 *    - El fondo general, en una celda (<td>) y no en el <body>: Gmail
 *      reemplaza el <body> del mail y descarta sus estilos.
 *    - Algunas cosas se "degradan" sin romper: Outlook de escritorio no
 *      redondea bordes (border-radius) y respeta poco el padding de un
 *      link, así que el botón se ve más simple, pero se ve.
 *    - Botones = links con estilo (<a> con fondo). No hay JavaScript.
 *    - Nada de variables de CSS, fuentes web, animaciones ni position.
 *    - El modo oscuro: algunos programas invierten los colores por su
 *      cuenta; elegí colores que se lean bien igual.
 *  Para no repetir los mismos estilos en cada etiqueta, los guardamos en
 *  ESTILOS_MAIL y el template los usa (ver plantillas/Mail.html).
 * ============================================================================
 */

/**
 * Estilos reutilizables para los mails. Son textos de CSS que el template
 * pone dentro de los atributos style="...".
 */
const ESTILOS_MAIL = {
  fondo: "margin:0;padding:24px 0;background-color:#f1f3f4;",
  contenedor:
    "width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;border-collapse:separate;",
  encabezado:
    "background-color:#1a73e8;padding:20px 24px;border-radius:8px 8px 0 0;",
  tituloEncabezado:
    "margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#ffffff;",
  cuerpo:
    "padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#202124;",
  tablaDatos: "width:100%;border-collapse:collapse;margin:16px 0;",
  celdaClave:
    "padding:8px 12px;border-bottom:1px solid #e8eaed;color:#5f6368;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
  celdaValor:
    "padding:8px 12px;border-bottom:1px solid #e8eaed;color:#202124;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;",
  boton:
    "display:inline-block;background-color:#1a73e8;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:12px 24px;border-radius:6px;",
  pie: "padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#80868b;",
};

/**
 * A quién mandarle los mails de prueba: a vos mismo (la cuenta que ejecuta).
 * @returns {string}
 */
function destinatarioDePrueba_() {
  return Session.getEffectiveUser().getEmail();
}

/**
 * Arma el HTML de un mail con el template plantillas/Mail.html.
 *
 * @param {{titulo: string, preencabezado: string, saludo: string, parrafos: string[],
 *          filas?: Array<[string, string]>, boton?: {texto: string, url: string}, pie: string}} contenido
 * @returns {string}  El HTML listo para htmlBody.
 */
function armarHtmlDeMail_(contenido) {
  const template = HtmlService.createTemplateFromFile(
    "docs-mail/plantillas/Mail",
  );
  template.c = { filas: [], boton: null, ...contenido };
  template.e = ESTILOS_MAIL;
  return template.evaluate().getContent();
}

/**
 * Arma la versión en texto plano del mismo contenido.
 *
 * @param {Object} contenido  El mismo objeto que armarHtmlDeMail_.
 * @returns {string}
 */
function armarTextoDeMail_(contenido) {
  const lineas = [
    contenido.titulo,
    "",
    contenido.saludo,
    "",
    ...contenido.parrafos,
  ];
  if (contenido.filas && contenido.filas.length > 0) {
    lineas.push(
      "",
      ...contenido.filas.map(([clave, valor]) => `${clave}: ${valor}`),
    );
  }
  if (contenido.boton) {
    lineas.push("", `${contenido.boton.texto}: ${contenido.boton.url}`);
  }
  lineas.push("", contenido.pie);
  return lineas.join("\n");
}

/**
 * Manda un mail con el diseño de la guía (HTML + texto plano + logo).
 * Es la versión explicada del sendEmail del código original (ver el
 * primer commit del repo).
 *
 * @param {string} para
 * @param {string} asunto
 * @param {Object} contenido      Ver armarHtmlDeMail_.
 * @param {GoogleAppsScript.Base.Blob[]} [adjuntos]
 */
function enviarMailConPlantilla_(para, asunto, contenido, adjuntos = []) {
  // La imagen del encabezado viaja DENTRO del mail (cid:logo), así se ve
  // aunque el programa de correo bloquee las imágenes de internet.
  const logo = Utilities.newBlob(
    Utilities.base64Decode(ICONO_ARBOL_BASE64),
    MimeType.PNG,
    "logo.png",
  );
  MailApp.sendEmail({
    to: para,
    subject: asunto,
    body: armarTextoDeMail_(contenido),
    htmlBody: armarHtmlDeMail_(contenido),
    inlineImages: { logo },
    attachments: adjuntos,
    name: "Guía Apps Script",
  });
}

/**
 * DEMO: el mail de "bienvenida" de un cliente (de los datos de C00001),
 * mandado A VOS MISMO. Revisá tu casilla: tiene que verse con colores,
 * la tabla, el botón y el logo.
 */
function demo_mailDeBienvenida() {
  const cliente = clienteParaUi_(clientePorFila_(2));
  const para = destinatarioDePrueba_();
  enviarMailConPlantilla_(
    para,
    `¡Bienvenido/a, ${cliente.nombre}! (prueba de la guía)`,
    {
      titulo: "¡Te damos la bienvenida!",
      preencabezado: `Hola ${cliente.nombre}, estos son tus datos de cliente.`,
      saludo: `Hola ${cliente.nombre},`,
      parrafos: [
        "Gracias por sumarte. Estos son los datos que registramos:",
        "Si algo no es correcto, respondé este mail y lo corregimos.",
      ],
      filas: [
        ["Número de cliente", cliente.id],
        ["Email", cliente.email],
        ["Ciudad", cliente.ciudad],
        ["Fecha de alta", cliente.fecha_alta],
      ],
      boton: {
        texto: "Ver la guía",
        url: "https://github.com/JoniDG/guide-appscript",
      },
      pie: "Este es un mail de prueba de la Guía de Apps Script, mandado a tu propia casilla.",
    },
  );
  console.log(
    `Mail mandado a ${para}. Te quedan ${MailApp.getRemainingDailyQuota()} destinatarios hoy.`,
  );
  avisarSiSePuede_(`Mail de bienvenida mandado a ${para}. Revisá tu casilla.`);
}

/** DEMO: el mail más simple posible, solo texto. */
function demo_mailSimple() {
  MailApp.sendEmail(
    destinatarioDePrueba_(),
    "Prueba simple (Guía Apps Script)",
    "Hola, esto es solo texto.",
  );
  console.log("Mandado. Cuota restante:", MailApp.getRemainingDailyQuota());
}
