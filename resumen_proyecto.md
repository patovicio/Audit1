# Auditoría Friosur — Resumen del Proyecto

> Aplicación móvil para auditoría comercial en campo, construida sin frameworks ni servidores propios.

---

## ¿Qué es y para qué sirve?

**Auditoría Friosur** es una app web progresiva (PWA) que usan los vendedores/auditores de Friosur para registrar visitas comerciales a sus clientes (almacenes, supermercados, kioscos) en toda la Patagonia. 

En cada visita el auditor puede:
- Verificar **activos** (freezers y máquinas de café) que Friosur tiene colocados en el local
- Relevrar **cobertura de productos** (marcas Marfrig y Froneri)
- Anotar **precios de la competencia** (Swift, La Casona, Panchin, etc.)
- Registrar **activos de la competencia** (freezers Arcor, Grido, Ice Cream, etc.)
- Cargar **ofertas y precios especiales** encontrados en el punto de venta
- Sacar hasta **4 fotos** de la visita
- Dejar **notas libres** (acuerdos, reclamos, comentarios)
- Enviar un **reporte por WhatsApp** en tiempo real

---

## Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| **Frontend** | HTML + Vanilla JS + TailwindCSS CDN | Un solo archivo, sin build step, sin bundler |
| **Diseño** | Material Design 3 (colores, tokens) | Sistema de diseño coherente, adaptable a dark mode |
| **Fuente de datos (clientes)** | JSON estático en GitHub Pages | Gratuito, versionado con git, actualizable sin deploy |
| **Backend (guardar auditorías)** | Google Apps Script (Web App) | Sin servidor, sin costo, escribe directo a Google Sheets |
| **Offline / PWA** | Service Worker + localStorage | Funciona sin internet, sincroniza cuando vuelve la conexión |

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────┐
│           CELULAR DEL AUDITOR               │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │         App PWA (index.html)         │   │
│  │  - Lista de 473 clientes             │   │
│  │  - Formulario de auditoría          │   │
│  │  - Historial local (localStorage)   │   │
│  │  - Cola offline (pendientes)        │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │        Service Worker (sw.js)        │   │
│  │  - Cachea HTML, íconos, fuentes      │   │
│  │  - Network-first para JSON clientes  │   │
│  │  - Fallback offline completo         │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│  GitHub Pages   │    │  Google Apps Script  │
│                 │    │   (Codigo.gs)        │
│ clientes_       │    │                      │
│ maestro.json    │    │  doGet()  → health   │
│ (473 clientes)  │    │  doGet()  → guardar  │
│                 │    │  doPost() → guardar  │
└─────────────────┘    └──────────────────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │    Google Sheets     │
                       │  "Auditorías"        │
                       │  (15 columnas)       │
                       │  - Timestamp         │
                       │  - Cliente/Comercio  │
                       │  - Activos (JSON)    │
                       │  - Cobertura         │
                       │  - Precios           │
                       │  - Competencia       │
                       │  - Notas/Fotos count │
                       └──────────────────────┘
```

---

## Flujo de datos — Paso a paso

### 1. Inicio de la app
```
App abre → fetch(clientes_maestro.json desde GitHub Pages)
         → guarda en localStorage como cache
         → renderiza lista de clientes
         → registra Service Worker
```

### 2. El auditor elige un cliente
```
Busca por nombre / comercio / ID / ciudad
→ chips de filtro por ciudad (Río Gallegos, El Calafate, etc.)
→ selecciona el cliente
→ app carga su formulario con activos pre-cargados del JSON
```

### 3. Completa la auditoría
```
Para cada freezer/máquina → marca OK o Discrepancia (con serie real + obs)
Cobertura Marfrig/Froneri → HAY (con detalle) o NC
Precios competencia → campos numéricos por producto
Activos competencia → toggle + nivel de stock (Lleno/Medio/Bajo/Vacío)
Ofertas → campos libres dinámicos
Fotos → cámara o galería, hasta 4, en base64
Notas → textarea libre
```

### 4. Guardar
```
construirDatosReporte()
  → guardarEnHistorialLocal() ← siempre, sin importar conexión
  → navigator.onLine?
      SÍ → enviarAGoogleSheets() → Google Sheets
           ¿error? → guardarEnColaPendiente() + toast "se enviará"
      NO  → guardarEnColaPendiente() + toast "sin conexión"
```

### 5. Sincronización automática
```
window.addEventListener('online') → sincronizarPendientes() con delay 2s
→ vacía la cola enviando cada auditoría pendiente
→ muestra cuántas se sincronizaron
```

### 6. WhatsApp (opcional)
```
guardarYWhatsApp()
  → guardarAuditoria() (igual que antes)
  → generarTextoWhatsApp() → formatea reporte con emojis
  → Android: usa intent a WhatsApp Business
  → iOS/otros: wa.me/?text=...
```

---

## Estructura de archivos

```
AppAuditoria/
├── index.html              ← Toda la app (UI + JS, ~895 líneas)
├── manifest.json           ← Config PWA (nombre, íconos, orientación)
├── sw.js                   ← Service Worker (caché offline)
├── clientes_maestro.json   ← Base de datos de clientes (473 registros)
├── Codigo.gs               ← Backend Google Apps Script
├── icons/
│   ├── icon-192.png        ← Ícono para Android
│   └── icon-512.png        ← Ícono splash screen
├── DEPLOY.md               ← Guía paso a paso para publicar
├── exportar_a_excel.py     ← Herramienta para exportar clientes
├── generar_app.py          ← Script auxiliar de generación
└── generar_iconos.py       ← Genera los íconos PNG
```

---

## Datos de clientes (clientes_maestro.json)

Cada cliente tiene esta forma:

```json
{
  "idcli": "10045",
  "cliente": "GARCIA JUAN CARLOS",
  "nombre_comercio": "Almacén El Progreso",
  "direccion": "Av. Kirchner 1234",
  "ciudad": "RIO GALLEGOS",
  "idvend": "V03",
  "freezers": ["SN-001234", "SN-005678"],
  "cafe_maquinas": ["CM-00091"]
}
```

Ciudades cubiertas: Río Gallegos, El Calafate, Río Turbio, 28 de Noviembre, Puerto San Julián, Piedrabuena, Gobernador Gregores, Puerto Santa Cruz, El Chaltén.

---

## Cómo se publica (deploy)

> Ver [DEPLOY.md](file:///g:/Mi%20unidad/AppAuditoria/DEPLOY.md) para la guía completa.

### Resumen en 4 pasos:

**1. GitHub (hosting gratuito)**
```bash
git init && git add index.html manifest.json sw.js clientes_maestro.json icons/
git commit -m "App de auditoría Friosur"
git remote add origin https://github.com/TU-USUARIO/friosur-audit.git
git push -u origin main
```

**2. GitHub Pages**
- Repo → Settings → Pages → Branch: main / root → Save
- URL resultante: `https://TU-USUARIO.github.io/friosur-audit/`

**3. Google Apps Script (backend)**
- Crear Google Sheet → agregar hoja "Auditorías"
- Ir a script.google.com → pegar `Codigo.gs` → cambiar `SPREADSHEET_ID`
- Implementar como Web App (acceso: cualquier persona)
- Copiar URL del script

**4. Conectar la app**
- En `index.html` cambiar `CONFIG.CLIENTES_URL` y `CONFIG.SHEETS_API_URL`
- Push a GitHub → automáticamente actualizado en ~1 minuto

---

## Cómo se instala en el celular

**Android (Chrome):**
Menú (3 puntos) → "Instalar app" → aparece como app nativa en el home

**iPhone (Safari):**
Botón compartir → "Agregar a pantalla de inicio"

> Una vez instalada, **funciona sin internet** gracias al Service Worker.

---

## Modo offline — ¿Cómo funciona?

| Situación | Comportamiento |
|-----------|---------------|
| Sin internet al abrir | Carga clientes desde cache local |
| Sin internet al guardar | Guarda en cola (localStorage) |
| Vuelve la conexión | Auto-sincroniza la cola a Sheets |
| Botón "Enviar pendientes" | Sincronización manual de la cola |

---

## Qué llega a Google Sheets

Cada auditoría genera una fila con **16 columnas** (enviadas vía `doGet` con query params):

| Timestamp | Fecha | Hora | ID Cliente | Cliente | Comercio | Dirección | Ciudad | Vendedor | Activos | Cobertura | Precios | Competencia | Ofertas | Notas | Fotos |
|-----------|-------|------|------------|---------|----------|-----------|--------|----------|---------|-----------|---------|-------------|---------|-------|-------|
| ISO 8601 | dd/mm/aa | hh:mm | numérico | nombre | comercio | dirección | ciudad | código | texto resumen | texto resumen | JSON | JSON | texto libre | texto libre | count |

---

## Cómo actualizar la lista de clientes

```
1. Modificar clientes_maestro.json
2. git add clientes_maestro.json && git commit && git push
3. GitHub Pages actualiza en ~1 minuto
4. La app descarga el nuevo JSON en la próxima apertura
```

---

## Decisiones de diseño relevantes

| Decisión | Alternativa | Por qué se eligió así |
|----------|-------------|----------------------|
| Un solo `index.html` | React/Vue/Next.js | Cero configuración, funciona con drag & drop en GitHub |
| Google Sheets como BD | PostgreSQL / Firebase | El equipo ya lo conoce, no requiere administrar servidores |
| Apps Script como API | Node.js / FastAPI | Gratis, autenticado con la cuenta Google, sin deploy |
| GitHub Pages | Vercel / Netlify | Simplicidad máxima, repositorio = hosting |
| Service Worker + localStorage | Sin offline | Los auditores trabajan en zonas con conectividad inestable |
| PWA instalable | App nativa (iOS/Android) | Sin App Store, sin review, deploy instantáneo |
