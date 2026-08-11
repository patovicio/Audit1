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

## PASO 1: Crear repositorio en GitHub (hosting gratuito)

1. Ir a https://github.com/new
2. Nombre del repo: `friosur-audit` (o el que quieras)
3. Dejarlo **público**
4. Crear el repositorio

### Subir los archivos:

Opción A - Desde la web de GitHub:
- Click "uploading an existing file"
- Arrastrar: `index.html`, `manifest.json`, `sw.js`, `clientes_maestro.json`, y la carpeta `icons/`
- Commit

Opción B - Con git desde la terminal:
```bash
cd "G:\Mi unidad\AppAuditoria"
git init
git add index.html manifest.json sw.js clientes_maestro.json icons/
git commit -m "App de auditoría Friosur"
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

## PASO 3: Actualizar la URL en index.html

Abrir `index.html` y cambiar en la sección CONFIG:

```javascript
const CONFIG = {
  CLIENTES_URL: "https://TU-USUARIO.github.io/friosur-audit/clientes_maestro.json",
  ...
};
```

Reemplazar `TU-USUARIO` por tu usuario de GitHub.

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
  CLIENTES_URL: "https://TU-USUARIO.github.io/friosur-audit/clientes_maestro.json",
  SHEETS_API_URL: "https://script.google.com/macros/s/TU-SCRIPT-ID/exec",
};
```

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

Cuando cambien los clientes:
1. Actualizar `clientes_maestro.json`
2. Hacer commit + push a GitHub
3. GitHub Pages se actualiza en ~1 minuto
4. La app cargará los datos nuevos en la próxima apertura

---

## Modo Offline

- La app cachea los clientes en el celular
- Si no hay conexión, funciona con los datos cacheados
- Las auditorías se guardan localmente y se envían al Sheet cuando vuelve internet
- El botón "Enviar pendientes" aparece si hay auditorías sin sincronizar
