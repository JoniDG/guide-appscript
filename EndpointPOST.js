function doPost(e) {
  //NO se puede enviar con JS un "FormData y un JSON en la misma request"
  let queryParams = null
  let body = null
  let bodyLength = null
  let type = null
  let response

  if (e.parameter) {  //Si hay queryParams o datos de un FormData
    queryParams = e.parameter
  }
  if (e.postData) { //Si hay un body
    body = JSON.parse(e.postData.contents)
    bodyLength = e.postData.length
    type = e.postData.type
  }

  if (queryParams !== null && queryParams.func) {
    if (Object.keys(queryParams).length > 1) {
      let { func, ...queryParamsFunc } = queryParams
      response = router(queryParams.func, 'POST', queryParamsFunc, body, bodyLength, type)
    } else {
      response = router(queryParams.func, 'POST', null, body, bodyLength, type)
    }
  } else {
    response = e
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)  //Respondo con un el objeto convertido a JSON 
}

/* 
Ejemplo de lo que contiene el objeto e considerando el siguiente endpoint:
https://script.google.com/macros/s/iddelaimplementacion/exec?testv1=joni&testv2=etc   | body:{ body1:"valor1", body2:"valor2" }

e:
{
  "parameter": {
        "testv1": "joni",
        "testv2": "etc"
    },
    "parameters": {
        testv1": [
            "joni"
        ],
        "testv2": [
            "etc"
        ]
    },
    "queryString": "testv1=joni&testv2=etc",
    "postData": {
        "contents": "{\r\n    \"body1\": \"valor1\",\r\n    \"body2\":\"valor2\"\r\n}",
        "length": 50,
        "name": "postData",
        "type": "application/json"
    },
    "contentLength": 50,
    "contextPath": ""
}
*/


