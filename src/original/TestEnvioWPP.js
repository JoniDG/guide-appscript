function sendWppApiMeta(identificadorTel, apikey, version, to, msg) {
  let url = `https://graph.facebook.com/${version}/${identificadorTel}/messages`
  //let url = "https://graph.facebook.com/v19.0/TU_PHONE_NUMBER_ID/messages"
  let body = {
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": to,
    "type": "text",
    "text": {
      "preview_url": false,
      "body": msg
    }
  }
  const headers = {
    'Authorization': `Bearer ${apikey}`
  }; // Encabezados personalizados si es necesario

  const opciones = {
    'method': 'post', // Método POST
    'contentType': 'application/json', // Tipo de contenido
    'headers': headers, // Encabezados
    'payload': JSON.stringify(body) // Datos en formato JSON
  };
  try {
    let response = UrlFetchApp.fetch(url, opciones);
    let jsonResponse = response.getContentText();
    console.log(`Response JSON:\n${jsonResponse}`)
    console.log(`Status Code: ${response.getResponseCode()}`)
    // Parsear el JSON para acceder a los valores
    let msgResponse = JSON.parse(jsonResponse)
    console.log(msgResponse)
  } catch (e) {
    console.log(`Error: ${e}`)
  }
}