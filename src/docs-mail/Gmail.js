/**
 * ============================================================================
 *  DOCS Y MAIL 3: GMAIL (BUSCAR, LEER, ETIQUETAR, BORRADORES, ADJUNTOS)
 * ============================================================================
 *
 *  GmailApp trabaja con TU casilla de Gmail.
 *
 *  IMPORTANTE, PERMISOS: GmailApp pide acceso COMPLETO a tu Gmail ("leer,
 *  redactar, enviar y eliminar permanentemente"). Y en Apps Script los
 *  permisos son de TODO EL PROYECTO: con solo tener este archivo, la
 *  autorización del proyecto incluye Gmail, aunque nunca ejecutes estas
 *  funciones. Si un proyecto solo necesita MANDAR mails, usá MailApp (ver
 *  Mail.js) y no incluyas GmailApp. Otra opción es fijar a mano los
 *  permisos en appsscript.json ("oauthScopes", ver
 *  fundamentos/ComoSeEjecuta.js), pidiendo solo los que hacen falta.
 *
 *  Cómo está organizado:
 *    GmailThread  -> una conversación (lo que ves como una fila en Gmail)
 *      GmailMessage -> cada mail de la conversación
 *        GmailAttachment -> cada adjunto (es un Blob: ver drive/Blobs.js)
 *    GmailLabel   -> una etiqueta
 *
 *  BUSCAR: GmailApp.search(consulta, desde, cantidad) usa la MISMA sintaxis
 *  que el buscador de Gmail:
 *    from:ana@example.com       to:me             subject:factura
 *    has:attachment             filename:pdf      is:unread
 *    newer_than:7d              older_than:1y     label:clientes
 *    "frase exacta"             -palabra (excluir)
 *  Pedí SIEMPRE una cantidad máxima, ej: search(consulta, 0, 20) (desde la
 *  posición 0, hasta 20; el máximo por búsqueda es 500): una búsqueda sin
 *  límite en una casilla grande puede tardar muchísimo o pasarse de la cuota.
 *
 *  ADJUNTOS: getAttachments() también devuelve las imágenes INCRUSTADAS
 *  (como el logo de los mails de la guía). Para quedarte solo con los
 *  adjuntos "de verdad": getAttachments({ includeInlineImages: false }).
 *
 *  CUOTAS: hay límites diarios de operaciones de Gmail y de mails enviados
 *  (ver fundamentos/Limites.js).
 *
 *  Estos demos solo LEEN o trabajan con los mails que la propia guía te
 *  mandó (asunto con "(prueba de la guía)"): no tocan el resto de tu
 *  casilla, salvo la etiqueta que agregan a esos mails.
 * ============================================================================
 */

/** Consulta que encuentra los mails que mandó la guía. */
// -in:drafts: sin los borradores (demo_crearBorrador crea uno con ese asunto).
const CONSULTA_MAILS_DE_LA_GUIA = 'subject:"prueba de la guía" newer_than:30d -in:drafts';

/** Etiqueta que la guía pone a sus propios mails. */
const ETIQUETA_GUIA = "Guía Apps Script";

/**
 * DEMO: buscar y leer los mails que te mandó la guía (corré antes
 * demo_mailDeBienvenida o demo_constanciaDeCliente).
 */
function demo_buscarMails() {
  // Hasta 10 conversaciones, empezando por la más reciente (posición 0).
  const hilos = GmailApp.search(CONSULTA_MAILS_DE_LA_GUIA, 0, 10);
  console.log(`Conversaciones encontradas: ${hilos.length}`);
  for (const hilo of hilos) {
    // getMessages: todos los mails de la conversación. Tomamos el último.
    const mensajes = hilo.getMessages();
    const ultimo = mensajes[mensajes.length - 1];
    console.log(
      `• ${formatearFecha_(ultimo.getDate(), "dd/MM HH:mm")} | ${ultimo.getSubject()} | ` +
        `${ultimo.getAttachments({ includeInlineImages: false }).length} adjunto(s) | sin leer: ${hilo.isUnread()}`,
    );
    // getPlainBody: el texto del mail, sin HTML. Mostramos el comienzo.
    console.log(
      `    "${ultimo.getPlainBody().slice(0, 80).replace(/\s+/g, " ")}…"`,
    );
  }
}

/**
 * DEMO: crear (si no existe) la etiqueta "Guía Apps Script" y ponérsela a
 * los mails de la guía.
 */
function demo_etiquetarMails() {
  // getUserLabelByName devuelve null si la etiqueta no existe.
  const etiqueta =
    GmailApp.getUserLabelByName(ETIQUETA_GUIA) ||
    GmailApp.createLabel(ETIQUETA_GUIA);
  const hilos = GmailApp.search(CONSULTA_MAILS_DE_LA_GUIA, 0, 50);
  // addToThreads: varias conversaciones de una vez (hasta 100).
  if (hilos.length > 0) {
    etiqueta.addToThreads(hilos);
  }
  console.log(
    `Etiqueta "${ETIQUETA_GUIA}" puesta en ${hilos.length} conversaciones. Mirá el costado izquierdo de Gmail.`,
  );
}

/**
 * DEMO: crear un BORRADOR (no se manda). Útil para que una persona lo
 * revise antes de enviarlo. Lo ves en la carpeta Borradores de Gmail.
 */
function demo_crearBorrador() {
  const borrador = GmailApp.createDraft(
    destinatarioDePrueba_(),
    "Borrador creado por la guía (prueba de la guía)",
    "Este mail NO se mandó: quedó como borrador para revisarlo.",
    {
      htmlBody:
        "<p>Este mail <b>no se mandó</b>: quedó como borrador para revisarlo.</p>",
    },
  );
  console.log("Borrador creado. ID:", borrador.getId());
}

/**
 * DEMO: guardar en Drive los adjuntos de los mails de la guía (por
 * ejemplo, los PDF de demo_constanciaDeCliente), en "Adjuntos de Gmail".
 */
function demo_guardarAdjuntosEnDrive() {
  const carpeta = obtenerOCrearSubcarpeta_(
    getGuideFolder_(),
    "Adjuntos de Gmail",
  );
  const hilos = GmailApp.search(
    `${CONSULTA_MAILS_DE_LA_GUIA} has:attachment`,
    0,
    10,
  );
  let guardados = 0;
  for (const hilo of hilos) {
    for (const mensaje of hilo.getMessages()) {
      for (const adjunto of mensaje.getAttachments({ includeInlineImages: false })) {
        // Un adjunto ES un Blob: se guarda directo con createFile.
        carpeta.createFile(adjunto.copyBlob());
        guardados++;
      }
    }
  }
  console.log(
    `Adjuntos guardados en "${carpeta.getName()}": ${guardados}. ${carpeta.getUrl()}`,
  );
}
