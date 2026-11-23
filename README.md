# Guía de Google Apps Script

Una guía práctica de **Google Apps Script**, con ejemplos comentados paso a paso, pensada para que alguien sin experiencia en programación pueda ir entendiéndola, y para que alguien que viene de un backend "tradicional" sepa hasta dónde se puede estirar Apps Script.

Cada tema tiene su carpeta en `src/`, y cada archivo explica en su encabezado qué demuestra, cuáles son los límites y qué errores comunes evitar.

## ¿Qué es Google Apps Script?

Es una plataforma de Google para escribir código **JavaScript** que se ejecuta en los servidores de Google (no en tu computadora) y que puede manejar tus herramientas de Google Workspace: Sheets, Drive, Gmail, Docs, Calendar, Forms, etc.

Sirve para cosas como:

- Automatizar tareas repetitivas en una planilla (copiar datos, generar reportes, mandar mails).
- Ejecutar código automáticamente: cada X minutos, cuando alguien edita una celda, cuando llega un formulario.
- Publicar una "mini API" o una página web sin tener un servidor propio.
- Conectar Google con otros servicios (APIs externas, sistemas de pago, mensajería, etc.).

## Temas

| #   | Tema                                                                                 | Carpeta                                                        | Estado    |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------- |
| 0   | Base: estructura, configuración y `setup()`                                          | [`src/config`](src/config)                                     | Listo     |
| 1   | Fundamentos: ejecución, límites, logging, errores y utils (fechas, IDs, hash, texto) | [`src/fundamentos`](src/fundamentos), [`src/utils`](src/utils) | Listo     |
| 2   | Spreadsheet: leer/escribir en bloque, filas como objetos, búsqueda en hojas grandes, formato, funciones personalizadas, fechas | [`src/spreadsheet`](src/spreadsheet) | Listo |
| 3   | Drive y archivos: carpetas, búsqueda, blobs/base64/CSV/zip, PDF y Excel, plantillas, permisos | [`src/drive`](src/drive) | Listo |
| 4   | Requests (HTTP saliente): GET/POST/JSON/archivos, códigos de error, en paralelo, reintentos, autenticación | [`src/requests`](src/requests) | Listo |
| 5   | Backend / Endpoints: web app como API REST (router, CRUD, token, subida de archivos, límites) | [`src/backend`](src/backend) | Listo |
| 6   | HTML / UI                                                                            | `src/html`                                                     | Pendiente |
| 7   | Triggers y automatización                                                            | `src/triggers`                                                 | Pendiente |
| 8   | Estado, concurrencia y jobs largos                                                   | `src/estado`                                                   | Pendiente |
| 9   | Docs y Mail                                                                          | `src/docs-mail`                                                | Pendiente |
| 10  | Avanzado                                                                             | `src/avanzado`                                                 | Pendiente |

La carpeta [`src/original`](src/original) tiene el código con el que empezó la guía, tal cual se escribió. Cada tema va reescribiendo y explicando su parte, hasta que esa carpeta desaparezca.

## Cómo usar la guía

Hay dos formas de usarla.

### Opción A: solo leer

Navegá las carpetas de `src/` acá en GitHub. Cada archivo está comentado para leerse de arriba hacia abajo.

### Opción B: tener tu propia copia funcionando

Así podés ejecutar los ejemplos en tu cuenta de Google.

**Requisitos**

- Una cuenta de Google.
- [Node.js](https://nodejs.org/) instalado (incluye `npm`).
- Habilitar la API de Apps Script en tu cuenta, una sola vez: entrá a <https://script.google.com/home/usersettings> y activá **"Google Apps Script API"**.

**Pasos**

1. Cloná el repo e instalá las dependencias:

   ```bash
   git clone https://github.com/JoniDG/guide-appscript.git
   cd guide-appscript
   npm install
   ```

2. Iniciá sesión con tu cuenta de Google. Se abre el navegador para que des permiso:

   ```bash
   npx clasp login
   ```

3. Creá **tu** Spreadsheet, con un proyecto de Apps Script ligado a ella:

   ```bash
   npx clasp create-script --type sheets --title "Guía Apps Script" --rootDir src
   ```

   Esto crea en tu Drive una Spreadsheet nueva y un archivo `.clasp.json` que conecta esta carpeta con tu proyecto. Ese archivo no se sube a GitHub; [`.clasp.json.example`](.clasp.json.example) muestra cómo es.

   > Ojo: `clasp create-script` reemplaza `src/appsscript.json` por uno genérico. Recuperá el de la guía con:
   >
   > ```bash
   > git restore src/appsscript.json
   > ```
   >
   > Si además aparece un `src/Code.js` (el archivo de ejemplo que Google crea en los proyectos nuevos), borralo.

4. Subí el código a tu proyecto:

   ```bash
   npx clasp push
   ```

   Si pregunta si querés sobrescribir el manifest, respondé que sí.

5. Abrí el editor (`npm run open`, o desde la Spreadsheet: **Extensiones > Apps Script**), abrí `config/Setup.gs`, elegí la función `setup` y tocá **▶ Ejecutar**.

   La primera vez Google pide autorización:

   - **Revisar permisos**, y elegí tu cuenta.
   - Si aparece "Google no verificó esta app": **Configuración avanzada > Ir a … (no seguro) > Permitir**.

   Es normal: el script es tuyo y no pasó por la verificación de Google, que solo hace falta para apps públicas.

6. Listo. `setup()` creó las hojas que usa la guía, una carpeta en tu Drive y el token de la API (`API_TOKEN`, en las Propiedades del script). Mirá la hoja **Inicio** de la Spreadsheet.

Cada vez que se agrega un tema nuevo, volvé a correr `setup()`: crea solo lo que falta. Para el tema Backend hay además un paso manual (publicar el web app y guardar su URL en la propiedad `WEBAPP_URL`), explicado en [`src/backend/Conceptos.js`](src/backend/Conceptos.js).

## Estructura del repo

```
guide-appscript/
├── src/                     # Todo lo que se sube a Apps Script (rootDir de clasp)
│   ├── appsscript.json      # "Manifest": zona horaria, permisos, config del web app
│   ├── config/              # Configuración, secretos y setup() de la guía
│   ├── fundamentos/         # Tema 1: cómo se ejecuta, límites, logging, errores
│   ├── utils/               # Funciones de ayuda reutilizables (fechas, IDs, hash, texto)
│   ├── spreadsheet/         # Tema 2: planillas (leer, escribir, buscar, formato, funciones en celdas)
│   ├── drive/               # Tema 3: Drive (carpetas, archivos, conversiones, permisos)
│   ├── requests/            # Tema 4: llamar a APIs externas (UrlFetchApp)
│   ├── backend/             # Tema 5: el proyecto como API (doGet/doPost, router, CRUD)
│   └── original/            # Código original, se va migrando tema por tema
├── .clasp.json.example      # Ejemplo de la config local de clasp
├── jsconfig.json            # Autocompletado de Apps Script en VS Code
└── package.json             # clasp y los tipos de Apps Script
```

En el editor online, las carpetas aparecen como parte del nombre del archivo: `config/Setup.js` se ve como `config/Setup.gs`.

## Convenciones de la guía

- **`demo_algo()`**: ejemplos listos para ejecutar desde el editor con ▶. No reciben parámetros, porque el botón ▶ no permite pasarlos.
- **`algo_()`** (con guion bajo al final): funciones "privadas" de ayuda. Apps Script no las muestra en el menú para ejecutar y no se pueden llamar desde una página web.
- **Nada de secretos en el código.** API keys, tokens e IDs privados van en las **Propiedades del script** (Configuración del proyecto > Propiedades del script) y se leen con `getConfig_("NOMBRE")`. Ver [`src/config/Config.js`](src/config/Config.js).
- **Todos los archivos comparten el mismo "espacio global".** Una función o constante definida en un archivo se puede usar desde cualquier otro, sin `import`. Por lo mismo, dos funciones con el mismo nombre en archivos distintos se pisan: gana la última que se cargó, y no hay ningún aviso. Con `const`, `let` o `class` es peor: si el mismo nombre se declara en dos archivos, **todo el proyecto deja de funcionar** con un `SyntaxError`, no solo esa parte.

## Trabajar con el código

| Comando         | Qué hace                                                          |
| --------------- | ----------------------------------------------------------------- |
| `npm run push`  | Sube tus cambios locales al proyecto de Apps Script               |
| `npm run watch` | Igual que `push`, pero automático cada vez que guardás un archivo |
| `npm run pull`  | Baja los cambios hechos en el editor online (pisa los locales)    |
| `npm run open`  | Abre el editor de Apps Script en el navegador                     |

Si editás en los dos lados (online y local), hacé `pull` antes de `push`: `push` reemplaza lo que haya online.

## Licencia

[MIT](LICENSE)
