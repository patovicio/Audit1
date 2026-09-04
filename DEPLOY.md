# Deploy - Auditoría Friosur PWA

## Estructura de archivos

```
AppAuditoria/
├── index.html              ← App principal (PWA)
├── manifest.json           ← Configuración PWA
├── sw.js                   ← Service Worker (offline)
├── clientes_maestro.json   ← Base de datos de clientes
├── Codigo.gs               ← Google Apps Script (backend)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── DEPLOY.md               ← Este archivo
```

---

> **IMPORTANTE (seguridad de datos):** el `clientes_maestro.json` contiene datos
> comerciales (ventas por cliente) y **NO se publica** en el repo público. La app
> lo descarga desde el Google Apps Script protegido por token, y el archivo vive en
> Google Drive. Está excluido en `.gitignore`.

## PASO 1: Crear repositorio en GitHub (hosting gratuito)

1. Ir a https://github.com/new
2. Nombre del repo: `friosur-audit` (o el que quieras)
3. Dejarlo **público** (solo contiene la app, sin datos sensibles)
4. Crear el repositorio

### Subir los archivos (SIN el maestro de clientes):

Opción A - Desde la web de GitHub:
- Click "uploading an existing file"
- Arrastrar: `index.html`, `manifest.json`, `sw.js`, y la carpeta `icons/`
- **NO subir `clientes_maestro.json`** (contiene datos de ventas)
- Commit

Opción B - Con git desde la terminal:
```bash
cd "AppAuditoria"
git add index.html manifest.json sw.js icons/ .gitignore
git commit -m "App de auditoría Friosur (sin maestro sensible)"
git remote add origin https://github.com/TU-USUARIO/friosur-audit.git
git push -u origin main
```

---

## PASO 2: Activar GitHub Pages

1. En el repo → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main` / `/(root)`
4. Save
5. Esperar 1-2 minutos
6. Tu URL será: `https://TU-USUARIO.github.io/friosur-audit/`

---

## PASO 3: Publicar el maestro de clientes en Drive + token (opción B)

El maestro NO va al repo. Se sirve desde el Apps Script leyéndolo de Google Drive.

### 3.1 Subir el JSON a Google Drive

1. Generar el archivo con:  `python generar_maestro_desde_duckdb.py`
   (o correr `extraer_datos_sql.bat`, que ya lo regenera).
2. Subir `clientes_maestro.json` a una carpeta de tu Google Drive.
3. Abrir el archivo en Drive → copiar el **ID** de la URL:
   `https://drive.google.com/file/d/ESTE_ES_EL_ID/view`

### 3.2 Configurar las propiedades del Apps Script

En el editor de Apps Script (script.google.com, mismo proyecto del backend):
1. Ir a **Configuración del proyecto** (ícono de engranaje) → **Propiedades del script**.
2. Agregar dos propiedades:
   - `CLIENTES_FILE_ID` = el ID del archivo de Drive del paso 3.1
   - `CLIENTES_TOKEN`   = una clave secreta larga (ej: `friosur-8f2ac91d3e-2026`)
3. Guardar y **volver a implementar** la Web App (Implementar → Administrar implementaciones → editar → nueva versión).

### 3.3 Poner el mismo token en la app

Abrir `index.html`, sección CONFIG, y reemplazar:

```javascript
const CONFIG = {
  SHEETS_API_URL: "https://script.google.com/macros/s/TU-SCRIPT-ID/exec",
  CLIENTES_TOKEN: "friosur-8f2ac91d3e-2026",  // ← el MISMO valor que CLIENTES_TOKEN en Apps Script
};
```

> La app arma sola la URL: `SHEETS_API_URL?action=clientes&token=CLIENTES_TOKEN`.

### 3.4 Actualizar clientes más adelante

1. Correr `extraer_datos_sql.bat` (regenera `clientes_maestro.json` con datos frescos).
2. Reemplazar el archivo en Drive (mismo archivo, así el FILE_ID no cambia).
3. La app trae la versión nueva en la próxima apertura online.

---

## PASO 4: Configurar Google Sheets (backend de auditorías)

### 4.1 Crear el Google Sheet

1. Ir a https://sheets.google.com → Crear hoja nueva
2. Renombrar a "Auditorías Friosur"
3. Renombrar la primera pestaña/hoja a exactamente: `Auditorías`
4. Copiar el ID del Sheet de la URL:
   `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`

### 4.2 Crear el Apps Script

1. Ir a https://script.google.com → Nuevo proyecto
2. Borrar el contenido por defecto
3. Pegar todo el contenido de `Codigo.gs`
4. En la línea que dice `const SPREADSHEET_ID = "TU_SPREADSHEET_ID_AQUI";`
   reemplazar por el ID que copiaste en el paso anterior
5. Guardar (Ctrl+S)

### 4.3 Publicar el Apps Script como Web App

1. Click en "Implementar" → "Nueva implementación"
2. Tipo: "Aplicación web"
3. Configurar:
   - Descripción: "API Auditoría Friosur"
   - Ejecutar como: **"Yo (tu email)"**
   - Quién tiene acceso: **"Cualquier persona"**
4. Click "Implementar"
5. Autorizar los permisos que pida
6. **Copiar la URL** que te da (empieza con `https://script.google.com/macros/s/...`)

### 4.4 Pegar la URL en index.html

```javascript
const CONFIG = {
  SHEETS_API_URL: "https://script.google.com/macros/s/TU-SCRIPT-ID/exec",
  CLIENTES_TOKEN: "friosur-8f2ac91d3e-2026",  // el mismo token del PASO 3
};
```

> El mismo Apps Script sirve dos cosas: guarda auditorías (`action=guardar`) y
> entrega el maestro de clientes (`action=clientes&token=...`).

---

## PASO 5: Probar

1. Abrir `https://TU-USUARIO.github.io/friosur-audit/` en el celular
2. Debería cargar los 473 clientes
3. Seleccionar un cliente, completar la auditoría, tocar "Guardar"
4. Verificar que aparezca la fila nueva en tu Google Sheet

---

## PASO 6: Instalar como App en el celular

### Android (Chrome):
1. Abrir la URL en Chrome
2. Tocar el menú (3 puntos) → "Instalar app" o "Agregar a pantalla de inicio"
3. Listo, aparece como app nativa

### iPhone (Safari):
1. Abrir la URL en Safari
2. Tocar el botón de compartir (cuadrado con flecha)
3. "Agregar a pantalla de inicio"
4. Listo

---

## Actualizar datos de clientes

Cuando cambien los clientes o las ventas:
1. Correr `extraer_datos_sql.bat` (regenera `clientes_maestro.json` desde DuckDB).
2. Reemplazar el archivo en Google Drive (mismo archivo → mismo FILE_ID).
3. La app cargará los datos nuevos en la próxima apertura online.

> El JSON NO se sube a GitHub (está en `.gitignore`). Se distribuye por Drive + token.

---

## Modo Offline

- La app cachea los clientes en el celular
- Si no hay conexión, funciona con los datos cacheados
- Las auditorías se guardan localmente y se envían al Sheet cuando vuelve internet
- El botón "Enviar pendientes" aparece si hay auditorías sin sincronizar
