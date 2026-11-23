const functionsGet = {}
const functionsPost = {}

function router(func, endpointType, queryParams, body, bodyLength, type) {
  if (endpointType === 'GET') {
    if (!functionsGet[func]) {
      return { error: `Func GET: ${func} no encontrada` }
    }
    return functionsGet[func](queryParams)
  }
  if (endpointType === 'POST') {
    if (!functionsPost[func]) {
      return { error: `Func POST: ${func} no encontrada` }
    }
    return functionsPost[func](queryParams, body, bodyLength, type)
  }
}



functionsGet["getData"] = (queryParams) => {
  let filtro = null
  let columna = null
  if (queryParams !== null) {
    if (Object.keys(queryParams).length > 0) {
      if (queryParams.id) {
        filtro = parseInt(queryParams.id)
        columna = 10
      }
      if (queryParams.vendedor) {
        filtro = queryParams.vendedor
        columna = 11
      }
    }
  }
  let fila = findNumberRowData("Datos Test", filtro, columna)
  if (fila !== null) {
    if (fila.length > 1) {
      let datos = []
      for (let i = 0; i < fila.length; i++) {
        let dato = {
          id: fila[i][9],
          nombre: fila[i][0],
          edad: fila[i][1],
          tAfiliacion: fila[i][2],
          gpFamiliar: fila[i][3],
          cel: fila[i][4],
          correo: fila[i][5],
          partido: fila[i][6],
          fecha: fila[i][7],
          hora: fila[i][8],
          vendedor: fila[i][10],
          estado: fila[i][13],
          fechaAsignacion: fila[i][14],
          fechaIngreso: fila[i][19],
        }
        datos.push(dato)
      }
      return datos
    } else {
      let dato = {
        id: fila[0][9],
        nombre: fila[0][0],
        edad: fila[0][1],
        tAfiliacion: fila[0][2],
        gpFamiliar: fila[0][3],
        cel: fila[0][4],
        correo: fila[0][5],
        partido: fila[0][6],
        fecha: fila[0][7],
        hora: fila[0][8],
        vendedor: fila[0][10],
        estado: fila[0][13],
        fechaAsignacion: fila[0][14],
        fechaIngreso: fila[0][19],
      }
      return dato
    }
  }
  if (fila === null) {
    return {
      error: "Dato no encontrado"
    }
  }
}

//NO se puede enviar con JS un "FormData y un JSON en la misma request"
functionsPost["saveData"] = (queryParams, body, bodyLength, type) => {
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName("Test QueryData-BodyData");
  let files = []
  let response = null
  if (queryParams !== null) {
    for (let key in queryParams) {
      if (key.includes('file')) {
        files.push(JSON.parse(queryParams[key]))
      } else {
        hojaTest.appendRow([key, queryParams[key]])
      }
    }
  }
  if (body !== null && bodyLength !== null && type !== null) {
    for (let key in body) {
      if (key.includes('file')) {
        for (let i = 0; i < body[key].length; i++) { //Recorro lo que contenga body.files (un array)
          files.push(body[key][i])  //Guardo en files el file
        }
      } else {
        hojaTest.appendRow([key, body[key]])
      }
    }
  }

  if (files.length > 0) {
    let hojaFiles = ss.getSheetByName("Upload Files");
    let errors = []
    let error = null
    error = validateFiles(files)
    if (error != null) {
      return { error: error, status: 406 }
    } else {
      for (let i = 0; i < files.length; i++) {
        let upload = uploadFile(files[i].content, files[i].mimeType, files[i].name)
        if (typeof upload === Error) {
          errors.push(upload)
          continue
        }
        hojaFiles.appendRow([upload])
        if (response === null) {
          response = { msgs: [], status: 200 }
        }
        response.msgs.push(upload)
      }
    }
    if (errors.length > 1) {
      response = { errors: errors, status: 202 }
      return response
    }
    return response
  }

}

function validateFiles(files) {
  let error = []
  for (let i = 0; i < files.length; i++) {
    if (files[i].content === "" || files[i].mimeType === "") {
      error.push(`${i + 1}- File ${files[i].name}: information is missing [${files[i].content} | ${files[i].mimeType}]`)
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
    filename = generarCodigoCorto_(5)
  }
  let blob = Utilities.newBlob(fileDecoded, mimeType, filename);
  let drive = DriveApp.getFolderById(testFolderDriveId)
  let destination = drive.createFile(blob)
  if (destination) {
    return `Archivo ${filename} cargado en Google Drive ${destination.getUrl()}| type: ${mimeType}`
  } else {
    return new Error(`Error al cargar ${filename} el archivo en Google Drive`)
  }
}
