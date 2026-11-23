// Tests de las funciones "puras" de la guía (las que no usan Google).
// Se corren con:  npm test
// Las que usan servicios de Google se prueban dentro de Apps Script con
// runAllTests (src/avanzado/Tests.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cargarGuia } from "./cargarGuia.mjs";

const g = cargarGuia();

test("formatearMonto_: miles, decimales, negativos e inválidos", () => {
  assert.equal(g.formatearMonto_(1878.3), "$ 1.878,30");
  assert.equal(g.formatearMonto_(1234567.891), "$ 1.234.567,89");
  assert.equal(g.formatearMonto_(-50), "-$ 50,00");
  assert.equal(g.formatearMonto_(-0.001), "$ 0,00");
  assert.throws(() => g.formatearMonto_("abc"), /Monto inválido/);
});

test("normalizarTexto_, pareceEmail_ y numeroEntreCorchetes_", () => {
  assert.equal(g.normalizarTexto_("  José   PÉREZ "), "jose perez");
  assert.equal(g.normalizarTexto_("Ñandú"), "nandu");
  assert.equal(g.pareceEmail_("ana@example.com"), true);
  assert.equal(g.pareceEmail_("ana@example"), false);
  assert.equal(g.numeroEntreCorchetes_("files[3]"), 3);
  assert.equal(g.numeroEntreCorchetes_("nada"), null);
});

test("diasEntre_ y sumarDias_ (sin problemas de horario de verano)", () => {
  assert.equal(g.diasEntre_(new Date(2025, 9, 14), new Date(2026, 9, 14)), 365);
  assert.equal(g.sumarDias_(new Date(2026, 0, 31), 1).getDate(), 1);
});

test("escaparParaRegex_ y escaparParaQuery_", () => {
  assert.equal(g.escaparParaRegex_("{{id}}"), "\\{\\{id\\}\\}");
  assert.equal(g.escaparParaQuery_("O'Brien"), "O\\'Brien");
});

test("objetosAFilas_ respeta el orden de encabezados y completa vacíos", () => {
  const filas = g.objetosAFilas_(["id", "nombre", "precio"], [{ precio: 5, id: 1, nombre: "A" }, { id: 2 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(filas)), [[1, "A", 5], [2, "", ""]]);
});

test("generador de datos de ejemplo: determinista y sin emails repetidos", () => {
  const a = g.generarClientesDeEjemplo_(500);
  const b = g.generarClientesDeEjemplo_(500);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(new Set(a.map((fila) => fila[2])).size, 500);
});

test("router: rutas, parámetros, 404, 405 y _method", () => {
  assert.deepEqual({ ...g.buscarRuta_("GET", "clientes/C00001").params }, { id: "C00001" });
  assert.equal(g.buscarRuta_("GET", "clientes/100%").params.id, "100%");
  assert.throws(() => g.buscarRuta_("GET", "productos"), /No existe la ruta/);
  assert.throws(() => g.buscarRuta_("PUT", "clientes/C1"), /no permitido/);
  assert.equal(g.metodoReal_("POST", {}, { _method: "patch" }), "PATCH");
  assert.throws(() => g.metodoReal_("POST", { _method: "HACK" }, {}), /_method inválido/);
});

test("leerCuerpo_: JSON, formulario y cuerpos inválidos", () => {
  assert.deepEqual({ ...g.leerCuerpo_({ postData: { contents: '{"a":1}', type: "text/plain" } }) }, { a: 1 });
  const form = g.leerCuerpo_({ postData: { contents: "nombre=Ana+G%C3%B3mez&x=100%", type: "application/x-www-form-urlencoded" } });
  assert.equal(form.nombre, "Ana Gómez");
  assert.equal(form.x, "100%");
  assert.throws(() => g.leerCuerpo_({ postData: { contents: "null", type: "text/plain" } }), /objeto JSON/);
  assert.throws(() => g.leerCuerpo_({ postData: { contents: "{mal", type: "application/json" } }), /JSON válido/);
});

test("validarCliente_: junta todos los errores y acepta parciales", () => {
  assert.throws(() => g.validarCliente_({ nombre: "A", email: "x", monto: -1, extra: 1 }, false), (error) => {
    return /campo desconocido: extra/.test(error.message) && /nombre/.test(error.message) && /monto/.test(error.message);
  });
  assert.deepEqual({ ...g.validarCliente_({ monto: 5, token: "x" }, true) }, { monto: 5 });
});

test("enteroEnRango_ (paginación)", () => {
  assert.equal(g.enteroEnRango_("0", 20, 1, 100), 1);
  assert.equal(g.enteroEnRango_(undefined, 20, 1, 100), 20);
  assert.equal(g.enteroEnRango_("500", 20, 1, 100), 100);
  assert.equal(g.enteroEnRango_("abc", 20, 1, 100), 20);
});
