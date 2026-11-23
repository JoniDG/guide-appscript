//No se ejecuta cuando se hace un appendRow o un setValue/setValues, solo se ejecuta cuando se cambia algo de una hoja
function eventOnChange(e) {
  console.log("Entre:",e.source.getActiveSheet().getActiveRange().getA1Notation())
  if(e.source.getSheetName() === "Register Data"){
    return
  } 
  let ss = SpreadsheetApp.openById(idTestSheet);
  let hojaTest = ss.getSheetByName("Register Data");
  hojaTest.getRange(hojaTest.getLastRow()+1,1,1,4).setValues([[e.changeType,e.source.getSheetName(),e.source.getActiveSheet().getActiveRange().getA1Notation(),new Date()]])//
}
