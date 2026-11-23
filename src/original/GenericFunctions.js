//Send email recibe: idEmail = "Nombre del HTML del email que queremos enviar" | data = Data que queremos enviar debe ser un objeto con LOS MISMOS NOMBRES DE KEYS QUE TIENE EL HTML | to = "email a quien le queremos enviar" | asunto: "Asunto del email"
//LAS KEYS QUE RECIBO TIENEN QUE COINCIDIR CON LAS KEYS QUE ESTEN EN EL HTML (ejemplo: <?= vendedor ?>    tiene que coincidir con data.vendedor)
function sendEmail(idEmail, data, to, asunto) {
  let plantilla = HtmlService.createTemplateFromFile(idEmail);
  for (let key in data) {
    plantilla[key] = data[key]
  }
  let htmlBody = plantilla.evaluate().getContent();
  let opciones = {
    htmlBody: htmlBody
  };
  MailApp.sendEmail(to, asunto, "", opciones);
}

//enviarWhatsapp recibe la url del ms de whatsapp, el body que queremos enviar y to=a quien se lo queremos enviar
function sendWhatsapp(url, bodyWpp, to) {
  let body = {
    "to": to,
    "bodyMsg": bodyWpp
  }
  const headers = {
    "username": "TU_USERNAME",
    "Client-Id": "TU_CLIENT_ID",
    "Api-Key": "TU_API_KEY"
  }; // Encabezados personalizados si es necesario

  const opciones = {
    'method': 'post', // Método POST
    'contentType': 'application/json', // Tipo de contenido
    'headers': headers, // Encabezados
    'payload': JSON.stringify(body) // Datos en formato JSON
  };
  let response = UrlFetchApp.fetch(url, opciones);
  let msgResponse = response.getContentText();
  let statusCode = response.getResponseCode()

  return ({ msgResponse, statusCode })
}

function createMenu() {
  SpreadsheetApp.getUi().createMenu('Funciones')
    .addItem('Abrir Modal', 'showModal').addItem('Test ENABLE Funcion Automatica', "enableAutomaticFunction").addItem('Test DISABLE Funcion Automatica', "disableAutomaticFunction")
    .addToUi();
}
