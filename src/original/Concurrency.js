//Si se intenta ejecutar dos veces la funcion "testLock" desde dos app script distintos debido al sleep arrojara error
//El trylock intentara acceder al lock durante X milisegundos arrojando true o false
function testLock() {
  let lock = LockService.getScriptLock()
  if (lock.tryLock(3000)) { // Espera hasta 3 segundos para adquirir el bloqueo
    try {
      // Código para manipular recursos compartidos
      let ss = SpreadsheetApp.openById("ID_DE_TU_SPREADSHEET");
      let hoja = ss.getSheetByName("Test Read Data");
      let dataHoja = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
      for(let i=0; i<dataHoja.length;i++){
        console.log(dataHoja[i][0])
      }
      console.log("Esperando")
      Utilities.sleep(5000);
    } finally {
      lock.releaseLock(); // Libera el bloqueo
    }
  } else {
    // Manejo si no se pudo adquirir el bloqueo
    console.log("El recurso está ocupado, intenta más tarde.")
    //return ContentService.createTextOutput("El recurso está ocupado, intenta más tarde.");
  }
}