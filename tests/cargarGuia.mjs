// Carga TODO el código de src/ en un "entorno" aislado de Node, para poder
// probar las funciones que no usan servicios de Google (formatear,
// normalizar, validar, rutear...) sin internet y en segundos.
//
// Apps Script junta todos los archivos en un mismo espacio global; acá
// hacemos lo mismo: concatenamos los .js y los ejecutamos juntos. Al
// cargarse no se llama a ningún servicio de Google (la guía no tiene código
// "suelto" que lo haga), así que no hace falta simularlos.
//
// Una diferencia: al juntar todo en un solo bloque, una función de un
// archivo queda disponible antes de que se "cargue" otro, cosa que en Apps
// Script no pasa. Por eso estos tests no detectan errores de ORDEN de
// carga (ver README: no usar, en código suelto, cosas de otros archivos).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

function archivosJs(carpeta) {
  return readdirSync(carpeta)
    .sort()
    .flatMap((nombre) => {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) return archivosJs(ruta);
      return nombre.endsWith(".js") ? [ruta] : [];
    });
}

export function cargarGuia() {
  // fileURLToPath (y no .pathname): así funciona aunque la carpeta tenga
  // espacios o acentos ("Mis Proyectos", "José") y también en Windows.
  const raiz = fileURLToPath(new URL("../src", import.meta.url));
  const codigo = archivosJs(raiz)
    .map((ruta) => readFileSync(ruta, "utf8"))
    .join("\n;\n");
  const contexto = vm.createContext({ console });
  vm.runInContext(codigo, contexto);
  return contexto;
}
