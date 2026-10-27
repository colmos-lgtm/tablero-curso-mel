# Tablero Curso Inmersión MEL — Línea de Base

Página web pública que muestra la línea de base del Curso Inmersión MEL de ZIGLA
y se actualiza sola a partir de las respuestas de inscripción (FormAssembly → Google Sheet).

## Cómo funciona (y por qué es seguro)

```
Google Sheet (privada)  →  Apps Script (Web App)  →  index.html (público, GitHub Pages)
 nombres, mails, etc.       calcula SOLO totales       dibuja los gráficos
```

- La planilla **sigue siendo privada**. Nadie de afuera puede abrirla.
- El programa de Apps Script (`apps-script/Code.gs`) corre con tu cuenta, lee la planilla
  y devuelve **solo conteos** (por ejemplo: "98 dijeron Sí"). Nunca devuelve nombres, mails,
  teléfonos ni IPs.
- La página (`index.html`) solo recibe esos conteos y los dibuja.
- Los resultados se guardan 10 minutos en memoria: una respuesta nueva puede tardar
  hasta 10 minutos en aparecer en el tablero.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El tablero (lo que ve la gente). |
| `apps-script/Code.gs` | El programa que va dentro de la planilla y calcula los totales. |
| `datos-ejemplo.json` | Números **inventados** para ver el diseño mientras no está conectada la planilla. |

---

## Paso 1 — Pegar el programa en la planilla

1. Abrí la planilla de respuestas en Google Sheets.
2. En el menú de arriba: **Extensiones → Apps Script**. Se abre una pestaña nueva con un editor de código.
3. A la izquierda vas a ver un archivo llamado `Código.gs` (o `Code.gs`). Hacé clic en él.
4. Borrá todo lo que tenga adentro.
5. En GitHub, abrí el archivo [`apps-script/Code.gs`](apps-script/Code.gs), tocá el botón
   **Copy raw file** (el ícono de dos hojitas, arriba a la derecha) y pegalo en el editor.
6. Guardá con el ícono del disquete (o `Ctrl + S`).
7. Arriba a la izquierda, cambiá el nombre del proyecto ("Proyecto sin título") por algo como
   **Tablero MEL**.

## Paso 2 — Publicarlo como Web App

1. En el editor de Apps Script, arriba a la derecha: **Implementar → Nueva implementación**.
2. Al lado de "Seleccionar tipo", tocá el engranaje ⚙️ y elegí **Aplicación web**.
3. Completá:
   - **Descripción:** Tablero MEL (cualquier texto sirve).
   - **Ejecutar como:** **Yo** (tu mail).
   - **Quién tiene acceso:** **Cualquier usuario**.
4. Tocá **Implementar**.
5. La primera vez Google pide permisos:
   - **Autorizar acceso** → elegí tu cuenta.
   - Si aparece "Google no verificó esta app": tocá **Configuración avanzada** →
     **Ir a Tablero MEL (no seguro)**. Es normal: la "app" es tu propio programa.
   - **Permitir**.
6. Copiá la **URL de la aplicación web** (empieza con `https://script.google.com/macros/s/` y termina en `/exec`).

> **¿"Cualquier usuario" no expone la planilla?** No. Esa opción permite que cualquiera
> *pida los totales* a la URL, pero el programa solo entrega números agregados.
> La planilla sigue privada.

**Probalo:** pegá la URL en el navegador. Tenés que ver un texto que empieza con
`{"actualizado":...`. Si ves `{"error": ...}`, el mensaje explica qué falta.
Si en la respuesta aparece `"faltantes"` con textos adentro, son columnas que el programa
no encontró en la planilla (por ejemplo, porque cambió el texto de una pregunta).

## Paso 3 — Pegar la URL en el tablero

1. En GitHub, abrí `index.html` y tocá el lápiz ✏️ (**Edit this file**).
2. Buscá esta línea (está casi al principio del `<script>`):
   ```js
   const APPS_SCRIPT_URL = "PEGAR_URL_AQUI";
   ```
3. Reemplazá `PEGAR_URL_AQUI` por la URL que copiaste, **dejando las comillas**:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```
4. Tocá **Commit changes…** → **Commit changes**.

Mientras la URL no esté pegada, el tablero muestra los **datos de ejemplo** con un aviso amarillo.

## Paso 4 — Activar GitHub Pages (publicar la página)

1. En el repositorio de GitHub: **Settings** (Configuración) → en el menú izquierdo, **Pages**.
2. En **Build and deployment → Source**, elegí **Deploy from a branch**.
3. En **Branch**, elegí **main** y la carpeta **/ (root)**. Tocá **Save**.
4. Esperá 1 o 2 minutos y recargá esa pantalla: arriba aparece
   "Your site is live at `https://colmos-lgtm.github.io/tablero-curso-mel/`".

> GitHub Pages gratis funciona con repositorios **públicos**. Si el repositorio es privado,
> hace falta un plan pago de GitHub. Hacer público el repositorio no expone datos personales:
> acá solo está el código, no la planilla.

---

## Mantenimiento

- **Nueva versión del formulario** ("Revision 48", etc.): no hay que hacer nada. El programa
  siempre usa la pestaña "Revision N" con el número más alto.
- **Si cambiás `Code.gs`:** después de pegar el código nuevo, andá a **Implementar →
  Gestionar implementaciones**, tocá el lápiz ✏️, en **Versión** elegí **Nueva versión** y
  **Implementar**. Así se mantiene la misma URL (no hace falta tocar `index.html`).
- **Ver los datos al instante** (sin esperar los 10 minutos): abrí la URL de la Web App
  agregando `?nocache=1` al final.
- **Organizaciones:** se cuentan entre todas las filas del curso MEL. Si preferís contarlas
  solo entre quienes completaron el formulario, en `Code.gs` cambiá
  `ORGS_SOLO_PARTICIPANTES = false` por `true`.

## Reglas de cálculo

- Se usa la pestaña "Revision N" con el N más alto.
- Las columnas se buscan por el texto del encabezado; si un encabezado se repite, se usa la **primera** aparición.
- Solo filas con Curso = "MEL".
- **Participantes:** filas con la pregunta "¿Tu organización tiene claridad respecto de lo que quiere medir?" respondida.
- **Organizaciones:** valores distintos de las columnas "Número de identificación", en mayúsculas y sin espacios, guiones ni puntos.
- Todos los porcentajes se calculan sobre el total de participantes.
- En preguntas de selección múltiple se busca cada opción exacta dentro de la respuesta (no se separa por comas, porque algunas opciones tienen comas adentro).
