/**
 * ============================================================================
 *  DRIVE 5: PERMISOS Y COMPARTIR
 * ============================================================================
 *
 *  Cada archivo o carpeta de Drive tiene:
 *    - Un DUEÑO (owner).
 *    - EDITORES y LECTORES con acceso individual (por email).
 *    - Un acceso "general" por link (DriveApp.Access):
 *        PRIVATE           -> solo las personas agregadas.
 *        DOMAIN_WITH_LINK  -> cualquiera de tu organización con el link
 *                             (solo cuentas de Google Workspace).
 *        ANYONE_WITH_LINK  -> cualquiera con el link, sin iniciar sesión.
 *        (Hay dos más: DOMAIN y ANYONE, que además hacen que el archivo se
 *        pueda encontrar buscando, sin tener el link.)
 *      con un nivel (DriveApp.Permission): VIEW, COMMENT, EDIT.
 *
 *  Compartir por código:
 *    archivo.addViewer("ana@example.com")   -> agrega un lector
 *    archivo.addEditor("ana@example.com")   -> agrega un editor
 *    archivo.removeEditor(...) / removeViewer(...)
 *    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
 *
 *  Cuidados:
 *    - Agregar a alguien puede mandarle un mail de aviso de Google. Con
 *      DriveApp no se puede evitar; con el servicio avanzado de Drive sí
 *      (tema Avanzado). Por eso estos demos NO agregan personas.
 *    - Las cuentas de empresa (Workspace) pueden tener prohibido compartir
 *      fuera de la organización o "con cualquiera con el link": en ese caso
 *      setSharing tira error.
 *    - Al compartir una CARPETA, se comparte todo lo que tiene adentro.
 * ============================================================================
 */

/**
 * DEMO: ver quién tiene acceso a la planilla de la guía.
 */
function demo_verPermisos() {
  const archivo = DriveApp.getFileById(getGuideSpreadsheet_().getId());
  console.log("Archivo:", archivo.getName());
  // getOwner() devuelve null si el archivo está en una unidad compartida
  // (Shared Drive): ahí los archivos son "de la unidad", no de una persona.
  const duenio = archivo.getOwner();
  console.log("Dueño:", duenio ? duenio.getEmail() : "(unidad compartida)");
  // getEditors / getViewers devuelven listas de usuarios (User).
  console.log(
    "Editores:",
    archivo
      .getEditors()
      .map((u) => u.getEmail())
      .join(", ") || "(ninguno)",
  );
  console.log(
    "Lectores:",
    archivo
      .getViewers()
      .map((u) => u.getEmail())
      .join(", ") || "(ninguno)",
  );
  console.log("Acceso general:", String(archivo.getSharingAccess()));
  console.log(
    "Nivel del acceso general:",
    String(archivo.getSharingPermission()),
  );
}

/**
 * DEMO: compartir un archivo "con cualquiera que tenga el link" y volver a
 * dejarlo privado.
 */
function demo_compartirConLink() {
  const archivo = carpetaDeDemos_().createFile(
    "compartido.txt",
    "Archivo de prueba",
    MimeType.PLAIN_TEXT,
  );

  try {
    archivo.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    );
    console.log(
      "Compartido con link. Cualquiera puede verlo en:",
      archivo.getUrl(),
    );
    console.log("Acceso ahora:", String(archivo.getSharingAccess()));
  } catch (error) {
    // Por ejemplo, si tu organización no permite compartir públicamente.
    console.warn("No se pudo compartir con link:", error.message);
  }

  // Volver a privado: solo el dueño y las personas agregadas.
  archivo.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  console.log("De nuevo privado. Acceso:", String(archivo.getSharingAccess()));
}
