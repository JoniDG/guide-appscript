//Funcion para probar lectura de datos
function testReadFunction(nombreHoja) {
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHoja);
  let dataHojaTest = hojaTest.getRange(1, 1, hojaTest.getLastRow(), hojaTest.getLastColumn()).getValues()
  console.log(dataHojaTest)
}

//Funcion para probar lectura y escritura de datos en una hoja oculta
function testHiddensheet(nombreHojaOculta) {
  //Test Hoja Oculta
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName(nombreHojaOculta);
  let dataHojaTest = hojaTest.getRange(1, 1, hojaTest.getLastRow(), hojaTest.getLastColumn()).getValues()
  console.log(dataHojaTest)
  hojaTest.appendRow([`Columna 1 | Fila ${hojaTest.getLastRow() + 1}`, `Columna 2 | Fila ${hojaTest.getLastRow() + 1}`, `Columna 3 | Fila ${hojaTest.getLastRow() + 1}`])
}