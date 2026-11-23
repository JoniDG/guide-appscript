//No se ejecuta cuando se hace un appendRow o un setValue/setValues, solo se ejecuta cuando se edita una hoja
function eventOnEdit(e) {
  /* 
  console.log(e.source.getName()) //Te da el nombre de la sheet
  console.log(e.source.getId()) //Te da el id de la sheet
  console.log(e.source.getUrl())  //Te da la URL de la sheet
  console.log(e.source.getEditors())  
  console.log("Valor Anterior:",e.oldValue) //Imprime el valor anterior que tenia la celda si es una sola celda la que se edito
  console.log("Valor Nuevo:",e.value)  //Imprime el nuevo valor si es una sola celda la que se edito
  console.log() 
  */
  let hojaEditada = e.source.getActiveSheet();
  let nombreHojaEditada = hojaEditada.getName();
  console.log(`Hoja Editada: ${nombreHojaEditada}`)
  console.log(`Usuario que edito: ${e.user.email} | ${e.user.nickname}`)
  console.log(`⬇️⬇️ Celda/s: ⬇️⬇️`)
  console.log(`COLUMN START ${e.range.columnStart} | COLUMN END ${e.range.columnEnd} || ROW START ${e.range.rowStart} | ROW END ${e.range.rowEnd}`)
  console.log("Valor Anterior:",e.oldValue) //Imprime el valor anterior que tenia la celda si es una sola celda la que se edito 
  /* (si primero se borro la celda y despues se escribio se disparan 2 eventos onEdit 1- Con: e.value = undefined | e.oldValue = "Lo que tenia antes" 2- Con e.value = "Nuevo valor" | e.oldValue = undefined) */
  console.log("Valor Nuevo:",e.value)  //Imprime el nuevo valor si es una sola celda la que se edito 


  //e.source.getActiveSheet().getName() //Obtiene el nombre de la hoja que se edito
  //e.range.columnStart
  //e.range.rowStart
  //e.range.columnEnd
  //e.range.rowEnd
  //e.source.getSheetByName("Hoja a la que queremos acceder")

}


/* 
e.source:

source: 
{
  getName: [Function],
  getKey: [Function], //Este es igual
  getId: [Function],  //A este (ambos te dan el id de la sheet)
  getUrl: [Function],
  getEditors: [Function],
}
 */



/*  
e.range:

range:
{
  columnEnd: 18,
  columnStart: 18,
  rowEnd: 6,
  rowStart: 6
}


*/



/* 
e.user:

user: 
{ 
  toString: [Function],
  getUsername: [Function],
  getEmail: [Function],
  getUserLoginId: [Function],
  email: 'usuario@example.com',
  nickname: 'usuario' 
}
*/