function onOpen(){
  createMenu()
}
function showModal() {
  let ui = SpreadsheetApp.getUi();
  ui.showModalDialog(HtmlService.createHtmlOutputFromFile('original/windowModal'), 'Mi Formulario');
}

function getHtml() {
  let html = HtmlService.createHtmlOutputFromFile('original/windowModal'); // Asume que tienes un archivo HTML llamado 'windowModal'
  return html.setTitle('Mi Formulario Modal');
}

function saveDataModal(nombre, apellido, email) {
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName("Test Window Modal Data");
  try {
    hojaTest.appendRow([nombre, apellido, email]);
    Browser.msgBox('Datos guardados correctamente.');
  } catch (e) {
    Browser.msgBox('Error al guardar los datos: ' + e.message);
  }
}