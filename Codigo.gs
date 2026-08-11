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

  // Si no tiene action, es solo un health check
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "Auditoría Friosur API",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
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
