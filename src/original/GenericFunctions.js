//Esta funcion devuelve el numero de fila donde se encuentra el dato a buscar
function findNumberRowData(nombreHoja, columna, datoABuscar) {
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHoja);
  let dataHojaTest = hojaTest.getRange(2, 1, hojaTest.getLastRow() - 1, hojaTest.getLastColumn()).getValues();

  // Filtra las filas donde el valor en la columna especificada coincide con el dato buscado
  let filasEncontradas = dataHojaTest.map((fila, index) => {
    return fila[columna - 1] === datoABuscar ? index + 1 : null; // Retorna el índice (1-indexed) o null
  }).filter(index => index !== null); // Filtra los valores nulos

  if (filasEncontradas.length > 0) {
    return filasEncontradas.map(function (numeroFila) { //Retorna un nuevo array con todas las filas +1
      return numeroFila + 1;  //Esta funcion a cada fila le suma 1 para obtener la fila real
    });
  }
  return null; // Retorna null si no se encuentra el dato
}

//Esta funcion busca y devuelve todas las filas que contengan el dato en la columna que estas buscando
//findRowData recibe el nombre de la hoja en la cual desea buscar el dato, el numero de columna (considerando que la columna 1 es la columna A) y el dato propiamente que desea buscar, si encuentra más de una fila con el dato que desea en la columna que desea, devolvera un array con todas las filas coincidentes, si no devolvera solo un array con un solo array dentro y si no encontro el dato devolvera null
function findRowData(nombreHoja, columna, datoABuscar) {
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHoja);
  let dataHojaTest = hojaTest.getRange(2, 1, hojaTest.getLastRow() - 1, hojaTest.getLastColumn()).getValues();

  // Filtra las filas donde el valor en la columna especificada coincide con el dato buscado
  let filasEncontradas = dataHojaTest.filter(fila => fila[columna - 1] === datoABuscar); // Filtra las filas completas

  if (filasEncontradas.length > 0) {
    //Logger.log("Dato encontrado en las filas: " + filasEncontradas.length);
    return filasEncontradas; // Retorna todas las filas donde se encontró el dato
  } else {
    //Logger.log("Dato no encontrado");
    return null; // Retorna null si no se encuentra el dato
  }
}

function findRowDataV2(nombreHoja, datoABuscar){
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHoja);
  let textFinder = hojaTest.createTextFinder(datoABuscar)
  let allOcurrences = textFinder.findAll()
  console.log(allOcurrences.length)
  let rows = allOcurrences.map((ocurrence)=>{
    return hojaTest.getRange(ocurrence.getRow(), 1, 1, hojaTest.getLastColumn()).getValues()[0];
  })
  
  return rows
}

//Esta funcion devuelve true o false si el dato esta en la hoja
function dataExist(nombreHoja, datoABuscar) {
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHoja);
  let datosHojaTest = hojaTest.getRange(1,1,hojaTest.getLastRow(),hojaTest.getLastColumn()).getValues().flat(); // Obtener todos los datos de la columna A de la Hoja 1  
  
  let datosHojaTestSet = new Set(datosHojaTest); // Convertir el array en un conjunto para una búsqueda más eficiente
  if (datosHojaTestSet.has(datoABuscar)) {
    //console.log(`El Dato ${datoABuscar} esta`)
    return true
  } else {
    //console.log(`El Dato ${datoABuscar} NO esta`)
    return false
  }
}

function dataExistV2(nombreHoja, datoABuscar){
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHoja);
  let textFinder = hojaTest.createTextFinder(datoABuscar).matchEntireCell(true)
  let allOcurrences = textFinder.findAll().length
  console.log(allOcurrences)
  if(allOcurrences > 0){
    return true
  }
  return false
}

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

//data = fecha = dia/mes/año | data = hora = hrs:min | data = fechayhora = dia/mes/año hrs:min
function getDate(data) {
  const ahora = new Date();

  const dia = ahora.getDate().toString().padStart(2, "0");
  const mes = (ahora.getMonth() + 1).toString().padStart(2, "0");
  const anio = ahora.getFullYear();

  const horas = ahora.getHours().toString().padStart(2, "0");
  const minutos = ahora.getMinutes().toString().padStart(2, "0");
  const segundos = ahora.getSeconds().toString().padStart(2, "0")


  switch (data) {
    case "dia":
      return dia
    case "mes":
      return mes
    case "año":
      return anio
    case "fecha":
      return `${dia}/${mes}/${anio}`
    case "hora":
      return `${horas}`
    case "minutos":
      return minutos
    case "segundos":
      return segundos
    
    case "horamin":
    return `${horas}:${minutos}hs`
    case "horaminseg":
    return `${horas}:${minutos}:${segundos}hs`
    case "fechayhora":
      return `${dia}/${mes}/${anio} ${horas}:${minutos}hs`
    case "fechaCompleta":
      return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}hs`
    default: console.log("Que queres obtener")
      return "No se especifico"
  }
}

//fecha1 = "14/10/2024"
//fecha2 = "14/10/2023"
//La funcion devuelva la cantidad de dias que pasaron entre la fecha 1 y la fecha 2 (en el ejemplo devuelve 366)
function daysBetweenDates(fecha1, fecha2) {
  // Convertir las fechas de string a objetos Date
  let [dia1, mes1, año1] = fecha1.split('/').map(Number);
  let [dia2, mes2, año2] = fecha2.split('/').map(Number);

  let fechaObj1 = new Date(año1, mes1 - 1, dia1); // Restar 1 al mes porque los meses en JS empiezan desde 0
  let fechaObj2 = new Date(año2, mes2 - 1, dia2);

  // Calcular la diferencia en milisegundos
  let diferenciaTiempo = fechaObj1 - fechaObj2;

  // Convertir la diferencia de milisegundos a días
  let diferenciaDias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

  return diferenciaDias;
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

function randomString(longitud) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let resultado = '';
  const caracteresLength = caracteres.length;
  for (let i = 0; i < longitud; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteresLength));
  }
  return resultado;

}

function findNumberInBrackets(str) {
  // Expresión regular para buscar un número dentro de corchetes []
  const regex = /\[(\d+)\]/;
  // Aplicamos la expresión regular al string dado
  const match = str.match(regex);
  // Si match no es null y tiene un grupo de captura (es decir, hay un número dentro de corchetes)
  if (match && match[1]) {
    // Devolvemos el número encontrado dentro de los corchetes
    return match[1];
  } else {
    // En caso contrario, devolvemos null o cualquier valor que indique que no se encontró un número dentro de los corchetes
    return null;
  }
}

function generateID(cel) {
  // Convertir el número a string y luego usar slice para obtener los últimos seis dígitos
  let numeroString = cel.toString();
  let ultimosSeisDigitos = numeroString.slice(-6);

  // Devolver los últimos seis dígitos como un número
  return parseInt(ultimosSeisDigitos, 10);
}