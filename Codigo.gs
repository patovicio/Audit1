/**
 * Google Apps Script - Backend para Auditoría Friosur
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Ir a https://script.google.com y crear un proyecto nuevo
 * 2. Pegar este código completo en el editor
 * 3. Crear un Google Sheet y copiar su ID (de la URL)
 * 4. Pegar el ID abajo en SPREADSHEET_ID
 * 5. En el Sheet, crear una hoja llamada "Auditorías"
 * 6. Publicar: Implementar > Nueva implementación > App web
 *    - Ejecutar como: "Yo"
 *    - Acceso: "Cualquier persona"
 * 7. Copiar la URL de la implementación y pegarla en CONFIG.SHEETS_API_URL del index.html
 */

// ============ CONFIGURACIÓN ============
const SPREADSHEET_ID = "1Za8ZKGGn1jbQ-4QamXcv1PRKhTu_UYKK0pkJhCoZVwo"; // <-- Cambiar por el ID de tu Sheet
const SHEET_NAME = "Auditorías";

// --- Maestro de clientes protegido (opción B) ---
// El archivo clientes_maestro.json vive en Google Drive (NO en el repo público).
// Configurar estos dos valores en el editor de Apps Script:
//   Proyecto → Configuración → Propiedades del script:
//     CLIENTES_FILE_ID  = ID del archivo clientes_maestro.json en Drive
//     CLIENTES_TOKEN    = una clave secreta larga (ej: friosur-9f3a...-2026)
// La app envía ?action=clientes&token=CLIENTES_TOKEN para descargarlo.
function _prop(nombre) {
  return PropertiesService.getScriptProperties().getProperty(nombre);
}

// ============ ENDPOINT POST: Recibir auditoría ============
function doPost(e) {
  try {
    // Leer datos: puede venir como postData.contents o como parameter.data (form)
    let rawData;
    if (e.postData && e.postData.contents) {
      rawData = e.postData.contents;
    } else if (e.parameter && e.parameter.data) {
      rawData = e.parameter.data;
    } else {
      throw new Error("No se recibieron datos");
    }

    const data = JSON.parse(rawData);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // Si la hoja está vacía, agregar encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Fecha", "Hora", "ID Cliente", "Cliente", "Comercio",
        "Dirección", "Ciudad", "Vendedor", "Activos (JSON)", "Cobertura (JSON)",
        "Precios (JSON)", "Competencia (JSON)", "Notas", "Fotos"
      ]);
      // Formato encabezados
      sheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#004ac6").setFontColor("#ffffff");
    }

    // Serializar objetos complejos
    const activosResumen = construirResumenActivos(data.activos || {});
    const coberturaResumen = construirResumenCobertura(data.cobertura || {});
    const preciosResumen = JSON.stringify(data.precios || {});
    const competenciaResumen = JSON.stringify(data.competencia || {});

    // Agregar fila
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.fecha || "",
      data.hora || "",
      data.clienteId || "",
      data.cliente || "",
      data.comercio || "",
      data.direccion || "",
      data.ciudad || "",
      data.vendedor || "",
      activosResumen,
      coberturaResumen,
      preciosResumen,
      competenciaResumen,
      data.notas || "",
      data.fotosCount || 0
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      message: "Auditoría registrada correctamente",
      row: sheet.getLastRow()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ ENDPOINT GET: Verificar que funciona + recibir auditorías ============
function doGet(e) {
  // --- action=clientes: servir el maestro de clientes protegido por token ---
  // El maestro (clientes_maestro.json) NO se publica en el repo publico porque
  // contiene datos comerciales (ventas por cliente). Se guarda en Google Drive
  // y se sirve solo si el token coincide.
  if (e && e.parameter && e.parameter.action === "clientes") {
    return servirClientes(e);
  }

  // Si viene con action=guardar, procesar datos
  if (e && e.parameter && e.parameter.action === "guardar" && e.parameter.data) {
    try {
      const data = JSON.parse(e.parameter.data);
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      
      // Si la hoja está vacía, agregar encabezados
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "Timestamp", "Fecha", "Hora", "ID Cliente", "Cliente", "Comercio",
          "Dirección", "Ciudad", "Vendedor", "Activos", "Cobertura",
          "Precios", "Competencia", "Ofertas", "Notas", "Fotos"
        ]);
        sheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#004ac6").setFontColor("#ffffff");
      }

      const activosResumen = construirResumenActivos(data.activos || {});
      const coberturaResumen = construirResumenCobertura(data.cobertura || {});
      const preciosResumen = JSON.stringify(data.precios || {});
      const competenciaResumen = JSON.stringify(data.competencia || {});
      const ofertasResumen = (data.ofertas || []).map(o => o.texto).filter(t => t).join(" | ");

      sheet.appendRow([
        data.timestamp || new Date().toISOString(),
        data.fecha || "",
        data.hora || "",
        data.clienteId || "",
        data.cliente || "",
        data.comercio || "",
        data.direccion || "",
        data.ciudad || "",
        data.vendedor || "",
        activosResumen,
        coberturaResumen,
        preciosResumen,
        competenciaResumen,
        ofertasResumen,
        data.notas || "",
        data.fotosCount || 0
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        message: "Auditoría registrada",
        row: sheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // --- action=guardarCafe: registrar auditoría de máquina de café ---
  if (e && e.parameter && e.parameter.action === "guardarCafe" && e.parameter.data) {
    return guardarAuditoriaCafe(e);
  }

  // --- action=ultimaCafe: último contador guardado de una máquina (por serie) ---
  if (e && e.parameter && e.parameter.action === "ultimaCafe") {
    return ultimaAuditoriaCafe(e);
  }

  // --- action=guardarFreezer: registrar auditoría de un freezer ---
  if (e && e.parameter && e.parameter.action === "guardarFreezer" && e.parameter.data) {
    return guardarAuditoriaFreezer(e);
  }

  // Si no tiene action, es solo un health check
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "Auditoría Friosur API",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============ AUDITORÍA DE CAFÉ ============
// Hoja dedicada, una fila por máquina auditada. Columnas de contadores fijas
// (C1..C16); los modelos con menos contadores dejan las sobrantes vacías.
// Pensada para exportar los valores al sistema de gestión de Nestlé.
const SHEET_CAFE = "Auditorías Café";
const CAFE_MAX_CONTADORES = 16;

function _cafeSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_CAFE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CAFE);
  }
  if (sheet.getLastRow() === 0) {
    const headers = ["Timestamp", "Fecha", "ID Cliente", "Cliente", "Comercio",
                     "Serie", "Modelo", "Estado", "Mantenimiento"];
    for (let i = 1; i <= CAFE_MAX_CONTADORES; i++) headers.push("C" + i);
    headers.push("Total Expendidos");
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground("#5a3921").setFontColor("#ffffff");
  }
  return sheet;
}

function guardarAuditoriaCafe(e) {
  const callback = e.parameter.callback || "";
  const responder = function (obj) {
    const cuerpo = JSON.stringify(obj);
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + cuerpo + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(cuerpo).setMimeType(ContentService.MimeType.JSON);
  };

  try {
    const data = JSON.parse(e.parameter.data);
    const sheet = _cafeSheet();

    // data.contadores = array de valores (índice 0 = C1, ...). Faltantes vacíos.
    const contadores = data.contadores || [];
    const fila = [
      data.timestamp || new Date().toISOString(),
      data.fecha || "",
      data.clienteId || "",
      data.cliente || "",
      data.comercio || "",
      data.serie || "",
      data.modelo || "",
      data.estado || "",
      data.mantenimiento || ""
    ];
    for (let i = 0; i < CAFE_MAX_CONTADORES; i++) {
      const v = contadores[i];
      fila.push(v === undefined || v === null || v === "" ? "" : v);
    }
    fila.push(data.totalExpendidos === undefined ? "" : data.totalExpendidos);

    sheet.appendRow(fila);

    return responder({ status: "ok", message: "Auditoría de café registrada", row: sheet.getLastRow() });
  } catch (error) {
    return responder({ status: "error", message: error.toString() });
  }
}

// Devuelve el último registro de contadores de una máquina (por serie), para
// que la app muestre el "valor anterior" y calcule los vasos expendidos.
function ultimaAuditoriaCafe(e) {
  const callback = e.parameter.callback || "";
  const responder = function (obj) {
    const cuerpo = JSON.stringify(obj);
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + cuerpo + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(cuerpo).setMimeType(ContentService.MimeType.JSON);
  };

  try {
    const serie = (e.parameter.serie || "").toString().trim();
    if (!serie) return responder({ status: "error", message: "Falta serie" });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_CAFE);
    if (!sheet || sheet.getLastRow() < 2) {
      return responder({ status: "ok", encontrado: false });
    }

    const values = sheet.getDataRange().getValues();
    // Columnas: 0 Timestamp,1 Fecha,2 IDCliente,3 Cliente,4 Comercio,5 Serie,
    //           6 Modelo,7 Estado,8 Mantenimiento,9.. C1..C16
    const COL_SERIE = 5, COL_FECHA = 1, COL_C1 = 9;
    let ultima = null;
    for (let r = 1; r < values.length; r++) {
      if (values[r][COL_SERIE].toString().trim() === serie) {
        ultima = values[r]; // se queda con la última coincidencia (más reciente al final)
      }
    }
    if (!ultima) return responder({ status: "ok", encontrado: false });

    const contadores = [];
    for (let i = 0; i < CAFE_MAX_CONTADORES; i++) {
      const v = ultima[COL_C1 + i];
      contadores.push(v === "" || v === null || v === undefined ? null : Number(v));
    }
    return responder({
      status: "ok",
      encontrado: true,
      fecha: ultima[COL_FECHA],
      contadores: contadores
    });
  } catch (error) {
    return responder({ status: "error", message: error.toString() });
  }
}

// ============ AUDITORÍA DE FREEZER ============
// Hoja dedicada, una fila por freezer auditado.
const SHEET_FREEZER = "Auditorías Freezer";

function _freezerSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_FREEZER);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FREEZER);
  }
  if (sheet.getLastRow() === 0) {
    const headers = ["Timestamp", "Fecha", "ID Cliente", "Cliente", "Comercio",
                     "Serie", "Nivel Volumen", "Invasión", "Detalle Invasión",
                     "Funcionando", "Categorías", "Observaciones"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground("#0d4f6c").setFontColor("#ffffff");
  }
  return sheet;
}

function guardarAuditoriaFreezer(e) {
  const callback = e.parameter.callback || "";
  const responder = function (obj) {
    const cuerpo = JSON.stringify(obj);
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + cuerpo + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(cuerpo).setMimeType(ContentService.MimeType.JSON);
  };

  try {
    const data = JSON.parse(e.parameter.data);
    const sheet = _freezerSheet();

    // categorias = array de strings (ej: ["Helados: Premium", "Postres"])
    const categorias = (data.categorias || []).join(", ");

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.fecha || "",
      data.clienteId || "",
      data.cliente || "",
      data.comercio || "",
      data.serie || "",
      data.nivelVolumen || "",
      data.invasion ? "SÍ" : "No",
      data.invasionDetalle || "",
      data.funcionando ? "SÍ" : "No",
      categorias,
      data.observaciones || ""
    ]);

    return responder({ status: "ok", message: "Auditoría de freezer registrada", row: sheet.getLastRow() });
  } catch (error) {
    return responder({ status: "error", message: error.toString() });
  }
}

// ============ HELPERS ============
function construirResumenActivos(activos) {
  const resumen = [];
  for (const uid in activos) {
    const a = activos[uid];
    if (a.estado === "ok") {
      resumen.push(`${a.tipo}(${a.serieOriginal||'S/N'}):OK`);
    } else if (a.estado === "disc") {
      resumen.push(`${a.tipo}(${a.serieOriginal||'EXTRA'})→${a.serieReal||'?'}${a.obs?' ['+a.obs+']':''}`);
    } else {
      resumen.push(`${a.tipo}(${a.serieOriginal||'S/N'}):pendiente`);
    }
  }
  return resumen.join(" | ");
}

function construirResumenCobertura(cobertura) {
  const partes = [];
  for (const marca in cobertura) {
    const val = cobertura[marca];
    if (val === "NC") {
      partes.push(`${marca}:NC`);
    } else if (Array.isArray(val)) {
      partes.push(`${marca}:${val.join(',') || 'vacío'}`);
    }
  }
  return partes.join(" | ");
}

// ============ MAESTRO DE CLIENTES (opción B: servir con token) ============
// Soporta JSONP: si se pasa &callback=nombre, envuelve la respuesta en esa
// función. La app usa JSONP porque el fetch() clásico contra Apps Script falla
// por CORS (Google responde con un redirect a otro dominio que el navegador bloquea).
function servirClientes(e) {
  const callback = e.parameter.callback || "";

  const responder = function (texto, esJson) {
    if (callback) {
      // Respuesta JSONP: callback(<contenido>)
      const cuerpo = esJson ? texto : JSON.stringify(texto);
      return ContentService.createTextOutput(callback + "(" + cuerpo + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    // Respuesta JSON normal
    return ContentService.createTextOutput(esJson ? texto : JSON.stringify(texto))
      .setMimeType(ContentService.MimeType.JSON);
  };

  const tokenEsperado = _prop("CLIENTES_TOKEN");
  const fileId = _prop("CLIENTES_FILE_ID");

  // Si falta configuración, avisar (sin exponer nada)
  if (!tokenEsperado || !fileId) {
    return responder({ status: "error", message: "Backend sin configurar (CLIENTES_TOKEN / CLIENTES_FILE_ID)" }, false);
  }

  // Validar token
  const tokenRecibido = e.parameter.token || "";
  if (tokenRecibido !== tokenEsperado) {
    return responder({ status: "error", message: "No autorizado" }, false);
  }

  // Leer el JSON desde Drive y devolverlo tal cual
  try {
    const contenido = DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
    return responder(contenido, true);
  } catch (error) {
    return responder({ status: "error", message: "No se pudo leer el maestro: " + error.toString() }, false);
  }
}
