function doGet(e) {
  let queryParams = null
  let response
  if (e.parameter) {
    queryParams = e.parameter
  }
  if (queryParams.func) { //Si tengo el query param "func"
    if (Object.keys(queryParams).length > 1) {
      let { func, ...queryParamsFunc } = queryParams
      response = router(queryParams.func, 'GET', queryParamsFunc, null, null, null)
    } else {
      response = router(queryParams.func, 'GET', null, null, null, null)
    }
  } else {
    let template = HtmlService.createTemplateFromFile("original/home");
    return template.evaluate()
    //response = e
  }
  //App Script siempre devolvera status code 200
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)  //Respondo con un el objeto convertido a JSON 
}

/* 
Ejemplo de lo que contiene el objeto e considerando el siguiente endpoint:
https://script.google.com/macros/s/iddelaimplementacion/exec?testv1=joni&testv2=etc

{
    "parameter": {
        "testv2": "etc",  //testv2
        "testv1": "joni"
    },
    "parameters": {
        "testv1": [
            "joni"
        ],
        "testv2": [
            "etc"
        ]
    },
    "contentLength": -1,
    "contextPath": "",
    "queryString": "testv1=joni&testv2=etc"
}
 */
