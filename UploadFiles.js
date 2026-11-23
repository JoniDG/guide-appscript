/* const testFolderDriveId = "ID_DE_TU_CARPETA_DE_DRIVE"
function doPost(e) {
  //NO se puede enviar con JS un "FormData y un JSON en la misma request"
  let queryParams
  let body
  let bodyLength
  let type
  let response = {}
  let files = []
  if (e.parameter) {  //Si hay queryParams o datos de un FormData
    queryParams = e.parameter
    for (let key in queryParams) {
      if (key.includes("files")) {  //Si alguna clave de algun queryParam o FormData es files[0]
        let numero = findNumberInBrackets(key)
        if (numero != null) {
          if (!response.files) {
            response.files = []
          }
          files.push(JSON.parse(queryParams[key]))
          response.files.push(JSON.parse(queryParams[key]))
        }
      } else {
        response[key] = queryParams[key]
      }
    }
  }
  if (e.postData) { //Si hay un body
    body = JSON.parse(e.postData.contents)
    bodyLength = e.postData.length
    type = e.postData.type

    for (let key in body) {
      if (key === "files") {  //Si en el body una de las claves se llama "files"
        if (!response.files) {
          response.files = []
        }
        for (let i = 0; i < body[key].length; i++) { //Recorro lo que contenga body.files (un array)
          files.push(body[key][i])  //Guardo en files el file
          response.files.push(body[key][i]) //Pusheo a la respuesta cada file
        }
      } else {
        if (!response.body) {
          response.body = {}
        }
        response.body[key] = body[key]
      }
    }

  }

  if (files.length > 0) {
    let error = null
    error = validateFiles(files)
    if (error != null) {
      response.error = error
      response.status = 406
    } else {
      for (let i = 0; i < files.length; i++) {
        let upload = uploadFile(files[i].content, files[i].mimeType, files[i].name)
        if (typeof upload === Error) {
          error.push(upload)
          continue
        }
        if (!response.msg) {
          response.msg = []
        }
        response.msg.push(upload)
      }
    }
  }
  response.status = 200
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)  //Respondo con un el objeto convertido a JSON 
}

function validateFiles(files) {
  let error = []
  for (let i = 0; i < files.length; i++) {
    if (files[i].content === "" || files[i].mimeType === "") {
      error.push(`${i + 1}- File ${files[i].name}: information is missing`)
    }
  }
  if (error.length > 0) {
    return error
  }
  return null
}

function uploadFile(fileBase64, mimeType, filename) {
  let fileDecoded = Utilities.base64Decode(fileBase64, Utilities.Charset.UTF_8);
  if (filename === "") {
    filename = randomString(5)
  }
  let blob = Utilities.newBlob(fileDecoded, mimeType, filename);
  let drive = DriveApp.getFolderById(testFolderDriveId)
  let destination = drive.createFile(blob)
  if (destination) {
    return `Archivo ${filename} cargado en Google Drive ${destination.getUrl()}`
  } else {
    return new Error(`Error al cargar ${filename} el archivo en Google Drive`)
  }
} */