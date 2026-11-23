function enableAutomaticFunction() {
  let nameTrigger = "automaticFunction"
  let triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === nameTrigger) {
      console.log(`El activador de ${nameTrigger} ya existe, se deshabilitara y creara uno nuevo`)
      console.log(`Deshabilitando Funcion Automatica a las ${getDate("horaminseg")}`)
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  automaticFunction()
  console.log(`Habilitando Funcion Automatica a las ${getDate("horaminseg")}`)
  ScriptApp.newTrigger(nameTrigger)
    .timeBased()
    .everyMinutes(1)
    .create();
}

function disableAutomaticFunction() {
  console.log(`Deshabilitando Funcion Automatica a las ${getDate("hora")}`)
  let triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    //console.log(triggers[i].getHandlerFunction())
    if (triggers[i].getHandlerFunction() === "automaticFunction") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
} 


function automaticFunction() {
  console.log(`Ejecutandome a las ${getDate("horaminseg")}`)
}
