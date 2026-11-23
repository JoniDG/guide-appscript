function getFolderByName(name){
  let folders = DriveApp.getFoldersByName(name)
  while (folders.hasNext()) {
    let folder = folders.next();
    return folder.getId()
  }
  return null
}

function createFolder(name) {
  let folder = DriveApp.createFolder(name)
  return folder.getId()
}

function createFile(folderId, name, content, mimeType) {
  if (!folderId) {
    return new Error("Missing folderId")
  }
  let destination = DriveApp.getFolderById(folderId);
  let file = null
  switch (mimeType) {
    case MimeType.PLAIN_TEXT:
    case MimeType.HTML:
    case MimeType.CSS:
    case MimeType.JAVASCRIPT:
    case MimeType.CSV:
      file = destination.createFile(name, content, mimeType)
      break;
    case MimeType.BMP:
    case MimeType.GIF: // Para imágenes GIF
    case MimeType.JPEG: // Para imágenes JPEG
    case MimeType.PNG: // Para imágenes PNG
    case MimeType.SVG: // Para imágenes SVG
    case MimeType.PDF: // Para archivos PDF
      // Asegurarse de que 'contenido' sea un Blob
      //if (content instanceof Blob) {
        file = destination.createFile(content)
        file.setName(name); // Establecer el nombre del archivo
      //} else {
        //return new Error("El contenido debe ser un Blob para imágenes.");
      //}
      break;
    case MimeType.GOOGLE_DOCS:
      file = DocumentApp.create(name)
      break;
    case MimeType.GOOGLE_FORMS:
      file = FormApp.create(name)
      break;
    case MimeType.GOOGLE_SHEETS:
      file = SpreadsheetApp.create(name)
      break;

    default:
      return new Error("Tipo de archivo no soportado");
  }
  return file.getId()
}

function copyFile(fileName, newName, folderId) {
  let destination = DriveApp.getFolderById(folderId);
  let files = DriveApp.getFilesByName(fileName)
  while (files.hasNext()) {
    let file = files.next();
    if (!newName) {
      newName = ""
    }
    let copy = file.makeCopy(`${newName}-Copia-${file.getName()}`, destination)
    return copy.getId()
  }
}


















