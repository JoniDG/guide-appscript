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
