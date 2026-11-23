function fetchPOST() {
  try {
    let url = "https://tu-servidor.ngrok-free.app/okpost"
    let body = {
      id: "1",
      email: "juan.perez@example.com",
      isActive: true,
      name: "Juan Pérez"
    }
    const headers = {
      "Authorization": "Bearer TU_TOKEN"
    }; // Encabezados personalizados si es necesario
    const opciones = {
      'method': 'post', // Método POST
      'contentType': 'application/json', // Tipo de contenido
      'headers': headers, // Encabezados
      'payload': JSON.stringify(body) // Datos en formato JSON
    };
    let response = UrlFetchApp.fetch(url, opciones);
    // Obtener el contenido de la respuesta como texto
    let jsonResponse = response.getContentText();
    console.log(`Response JSON:\n${jsonResponse}`)
    console.log(`Status Code: ${response.getResponseCode()}`)
    // Parsear el JSON para acceder a los valores
    let msgResponse = JSON.parse(jsonResponse)
    console.log(`ID: ${msgResponse.id}`)
    console.log(`MSG: ${msgResponse.msg}`)
    console.log(typeof msgResponse.id)
    console.log(typeof msgResponse.msg)
    //throw new Error("Error forzado")
  } catch (e) {
    console.log(`Error: ${e}`)
  }
}

function fetchGET() {
  try {
    let baseUrl = "https://tu-servidor.ngrok-free.app/okpost"

    const headers = {
      'Authorization': 'Bearer TU_TOKEN',
      'Content-Type': 'application/json'
    }; // Encabezados personalizados si es necesario
    const opciones = {
      method: 'get', // Método GET
      muteHttpExceptions: true, // Permitir capturar errores HTTP
      headers: headers, // Encabezados
    };
    let params = {
        search: 'ejemplo',
        limit: 10,
        sort: 'asc'
    };
    // Construir la URL con los parámetros de consulta
    let queryString = Object.keys(params)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');
    
    let url = `${baseUrl}?${queryString}`;
    let response = UrlFetchApp.fetch(url, opciones);
    // Obtener el contenido de la respuesta como texto
    let jsonResponse = response.getContentText();
    console.log(`Response JSON:\n${jsonResponse}`)
    console.log(`Status Code: ${response.getResponseCode()}`)
    // Parsear el JSON para acceder a los valores
    let msgResponse = JSON.parse(jsonResponse)
    console.log(`ID: ${msgResponse.id}`)
    console.log(`MSG: ${msgResponse.msg}`)
    console.log(typeof msgResponse.id)
    console.log(typeof msgResponse.msg)
    //throw new Error("Error forzado")
  } catch (e) {
    console.log(`Error: ${e}`)
  }
}
