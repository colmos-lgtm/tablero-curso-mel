/**
 * Tablero Curso Inmersión MEL — Línea de Base
 *
 * Web App que lee las respuestas de inscripción y devuelve SOLO conteos
 * agregados en JSON. Nunca devuelve nombres, mails, teléfonos ni IPs.
 *
 * Probar a mano: abrir la URL de la Web App agregando ?nocache=1 al final
 * para forzar el recálculo sin esperar los 10 minutos de caché.
 */

var SPREADSHEET_ID = '1JfnM5YJ6g8_PJMDM34VwXOXp0pRKG_UkPbfMoCRPkZ4';
var CURSO = 'MEL';
var CACHE_KEY = 'tablero_mel_v1';
var CACHE_SEGUNDOS = 600; // 10 minutos

// Si es true, las organizaciones se cuentan solo entre los participantes
// (filas con la pregunta de claridad respondida). Si es false, entre todas
// las filas del curso MEL.
var ORGS_SOLO_PARTICIPANTES = false;

var COL = {
  curso: 'Curso',
  id: 'Número de identificación',
  claridad: '¿Tu organización tiene claridad respecto de lo que quiere medir?',
  indicadores: '¿Tu organización cuenta con indicadores para monitorear sus resultados?',
  estrategia: '¿Tu organización actualmente cuenta con una estrategia de Monitoreo y Evaluación?',
  temas: '¿Cuáles de los siguientes temas consideras de mayor interés?',
  iaIntegracion: '¿En qué medida tu organización ha integrado herramientas de Inteligencia Artificial Generativa o Analítica en sus procesos formales de trabajo?',
  iaDirectrices: '¿Cuenta tu organización con directrices, políticas o infraestructura para el uso seguro de IA?',
  iaAreas: '¿En qué áreas o procesos de tu organización se utiliza actualmente la IA?'
};

var TEMAS = [
  'Metodologías de diseño de proyectos (Teoría del Cambio y Marco Lógico)',
  'Diseño de indicadores (producto, resultado e impacto)',
  'Diseño de instrumentos de recolección de información',
  'Herramientas de análisis y recolección de información',
  'Herramientas de visualización cuantitativa y storytelling',
  'Plataformas tecnológicas de Monitoreo y Evaluación',
  'Evaluación de resultados',
  'Evaluación de impacto'
];

var NIVELES = ['No conozco', 'Básico', 'Intermedio', 'Avanzado'];

var ITEMS = {
  metodologias: [
    'Análisis Costo Beneficio',
    'Enfoque de Marco Lógico',
    'Evaluación de Impacto - Cuasi-experimental',
    'Evaluación de Impacto - Enfoque experimental',
    'Evaluación de Procesos',
    'Evaluación de Resultados con criterios OCDE-DAC (Relevancia, Efectividad, Eficiencia, Sostenibilidad)',
    'Métodos mixtos de evaluación de resultados',
    'Retorno Social de la Inversión (SROI)',
    'Teoría de Cambio'
  ],
  tecnicas: [
    'Análisis cualitativo',
    'Análisis cuantitativo-descriptivo',
    'Análisis cuantitativo-econométrico',
    'Diseño de cuestionarios estructurados',
    'Diseño de indicadores cualitativos',
    'Diseño de indicadores cuantitativos',
    'Entrevista en profundidad',
    'Estudios de caso',
    'Grupos focales / talleres participativos',
    'Limpieza y manejo de bases de datos',
    'Triangulación de Información'
  ],
  herramientas: [
    'Asistentes de IA aplicados a MEL (Gemini Gems, GPTs personalizados, NotebookLM)',
    'Automatización con IA (Zapier, Make, bots con IA)',
    'Captura de información cuanti (Kobo, Formassembly, Gforms, etc)',
    'Data science (Python, R, etc)',
    'Inteligencia Artificial Generativa (ChatGPT, Claude, Gemini, etc.)',
    'Microsoft Excel',
    'Plataformas de Monitoreo y Evaluación (SoPact, TolaData, etc)',
    'Procesamiento y análisis cualitativo (Atlas.Ti, otros)',
    'Procesamiento y análisis estadístico (Stata, R, SPSS, etc)',
    'Sistemas de gestión/CRM (Salesforce, Dynamics, etc)',
    'Storytelling (Sway, Atavist, Medium, etc)',
    'Visualización de información (Tableau, Power Bi, etc)'
  ]
};

// Orden en que se muestran las respuestas de IA (se compara por el comienzo del texto).
var ORDEN_INTEGRACION = ['Sin adopción formal', 'Uso puntual', 'Exploratorio',
  'Integración en flujos de trabajo', 'Soluciones propias', 'Avanzadas'];
var ORDEN_DIRECTRICES = ['No', 'Prohibido', 'No, pero está permitido', 'En proceso', 'Sí, completamente'];

var AREAS_IA = [
  'Redacción y comunicación institucional',
  'Gestión de proyectos y tareas administrativas',
  'Procesamiento y análisis de datos cualitativos',
  'No se utiliza actualmente a nivel organizacional',
  'Análisis de datos cuantitativos o generación de código',
  'Atención a usuarios o beneficiarios'
];

function doGet(e) {
  var forzar = e && e.parameter && e.parameter.nocache === '1';
  var cache = CacheService.getScriptCache();
  var json = forzar ? null : cache.get(CACHE_KEY);
  if (!json) {
    try {
      json = JSON.stringify(calcular());
      cache.put(CACHE_KEY, json, CACHE_SEGUNDOS);
    } catch (err) {
      json = JSON.stringify({ error: String((err && err.message) || err) });
    }
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function calcular() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoja = ultimaRevision(ss);
  var valores = hoja.getDataRange().getDisplayValues();
  var encabezados = valores[0].map(clave);
  var filas = valores.slice(1);
  var faltantes = [];

  function col(texto, porComienzo) {
    var i = buscarColumna(encabezados, texto, porComienzo);
    if (i < 0) faltantes.push(texto);
    return i;
  }

  var iCurso = col(COL.curso);
  var iClaridad = col(COL.claridad);
  if (iCurso < 0 || iClaridad < 0) {
    throw new Error('En la pestaña "' + hoja.getName() + '" no se encontraron las columnas: ' + faltantes.join(' | '));
  }

  var mel = filas.filter(function (r) { return limpiar(r[iCurso]).toUpperCase() === CURSO; });
  var part = mel.filter(function (r) { return limpiar(r[iClaridad]) !== ''; });

  // Organizaciones: valores distintos al unir todas las columnas "Número de identificación".
  var claveId = clave(COL.id);
  var iIds = [];
  encabezados.forEach(function (h, i) { if (h === claveId) iIds.push(i); });
  if (!iIds.length) faltantes.push(COL.id);
  var ids = {};
  (ORGS_SOLO_PARTICIPANTES ? part : mel).forEach(function (r) {
    iIds.forEach(function (i) {
      var id = String(r[i] || '').toUpperCase().replace(/[\s\-‐‑–—.]/g, '');
      if (id) ids[id] = true;
    });
  });

  function siNo(texto) {
    var i = col(texto);
    var res = { si: 0, no: 0 };
    if (i < 0) return res;
    part.forEach(function (r) {
      var v = sinAcentos(limpiar(r[i])).toLowerCase();
      if (v.indexOf('si') === 0) res.si++;
      else if (v.indexOf('no') === 0) res.no++;
    });
    return res;
  }

  // Selección múltiple: se busca cada opción exacta dentro del texto (no se separa por coma).
  function multiple(texto, opciones) {
    var i = col(texto, true);
    var res = opciones.map(function (o) { return { label: o, n: 0 }; });
    if (i >= 0) {
      part.forEach(function (r) {
        var v = clave(r[i]);
        res.forEach(function (o) { if (v.indexOf(clave(o.label)) >= 0) o.n++; });
      });
    }
    return res.sort(function (a, b) { return b.n - a.n; });
  }

  // Selección única: la etiqueta es el texto antes del primer " (".
  function unica(texto, orden) {
    var i = col(texto, true);
    var cuenta = {};
    if (i >= 0) {
      part.forEach(function (r) {
        var v = limpiar(r[i]);
        if (!v) return;
        var corte = v.indexOf(' (');
        var label = corte >= 0 ? v.slice(0, corte).trim() : v;
        cuenta[label] = (cuenta[label] || 0) + 1;
      });
    }
    return Object.keys(cuenta)
      .map(function (label) { return { label: label, n: cuenta[label], orden: posicion(label, orden) }; })
      .sort(function (a, b) { return a.orden - b.orden; })
      .map(function (o) { return { label: o.label, n: o.n }; });
  }

  function conocimiento(items) {
    var claves = NIVELES.map(function (n) { return sinAcentos(n).toLowerCase(); });
    var res = [];
    items.forEach(function (item) {
      var i = col(item);
      if (i < 0) return;
      var n = [0, 0, 0, 0];
      part.forEach(function (r) {
        var v = sinAcentos(limpiar(r[i])).toLowerCase();
        for (var k = 0; k < claves.length; k++) {
          if (v.indexOf(claves[k]) === 0) { n[k]++; break; }
        }
      });
      res.push({ item: item, n: n });
    });
    return res;
  }

  return {
    actualizado: new Date().toISOString(),
    hoja: hoja.getName(),
    organizaciones: Object.keys(ids).length,
    participantes: part.length,
    siNo: {
      claridad: siNo(COL.claridad),
      indicadores: siNo(COL.indicadores),
      estrategia: siNo(COL.estrategia)
    },
    temas: multiple(COL.temas, TEMAS),
    niveles: NIVELES,
    conocimiento: {
      metodologias: conocimiento(ITEMS.metodologias),
      tecnicas: conocimiento(ITEMS.tecnicas),
      herramientas: conocimiento(ITEMS.herramientas)
    },
    ia: {
      integracion: unica(COL.iaIntegracion, ORDEN_INTEGRACION),
      directrices: unica(COL.iaDirectrices, ORDEN_DIRECTRICES),
      areas: multiple(COL.iaAreas, AREAS_IA)
    },
    faltantes: faltantes
  };
}

/** Devuelve la pestaña "Revision N" con el N más alto. */
function ultimaRevision(ss) {
  var mejor = null, max = -1;
  ss.getSheets().forEach(function (h) {
    var m = /^\s*revision\s+(\d+)\s*$/i.exec(h.getName());
    if (m && Number(m[1]) > max) { max = Number(m[1]); mejor = h; }
  });
  if (!mejor) throw new Error('No hay ninguna pestaña llamada "Revision N" en la planilla.');
  return mejor;
}

/** Primera columna cuyo encabezado coincide; si no hay, la primera que empieza con ese texto. */
function buscarColumna(encabezados, texto, porComienzo) {
  var k = clave(texto);
  var i = encabezados.indexOf(k);
  if (i >= 0 || !porComienzo) return i;
  for (var j = 0; j < encabezados.length; j++) {
    if (encabezados[j].indexOf(k) === 0) return j;
  }
  return -1;
}

/** Posición de una respuesta en el orden deseado (por el comienzo más largo que coincide). */
function posicion(label, orden) {
  var l = clave(label), mejor = orden.length, largo = -1;
  orden.forEach(function (o, i) {
    var k = clave(o);
    if (l.indexOf(k) === 0 && k.length > largo) { largo = k.length; mejor = i; }
  });
  return mejor;
}

function limpiar(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
function sinAcentos(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
/** Texto normalizado para comparar: sin espacios de más, sin acentos, en minúsculas. */
function clave(v) { return sinAcentos(limpiar(v)).toLowerCase(); }
