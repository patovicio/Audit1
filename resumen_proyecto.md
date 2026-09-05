# Auditoría Friosur — Resumen del Proyecto

> Aplicación móvil para auditoría comercial en campo, construida sin frameworks ni servidores propios.

---

## ¿Qué es y para qué sirve?

**Auditoría Friosur** es una app web progresiva (PWA) que usan los vendedores/auditores de Friosur para registrar visitas comerciales a sus clientes (almacenes, supermercados, kioscos) en toda la Patagonia. 

En cada visita el auditor puede:
- Ver de un vistazo el **contexto comercial del cliente**: venta del mes en curso,
  fecha del último pedido y top de productos (datos reales del ERP vía DuckDB)
- Verificar **activos** (freezers y máquinas de café) que Friosur tiene colocados en el local
- Relevar **cobertura de productos** (marcas Marfrig y Froneri)
- Anotar **precios de la competencia** (Swift, La Casona, Panchin, etc.)
- Registrar **activos de la competencia** (freezers Arcor, Grido, Ice Cream, etc.)
- Registrar **servicio de máquina de café** (contadores, mantenimiento, reparación)
- Cargar **ofertas y precios especiales** encontrados en el punto de venta
- Sacar hasta **4 fotos** de la visita
- Dejar **notas libres** (acuerdos, reclamos, comentarios)
- Enviar un **reporte por WhatsApp** en tiempo real (formato sobrio que leen
  directivos y gerentes a diario)

> **Documento de continuidad técnico:** ver `ESTADO_PROYECTO.md` (configuración
> viva: IDs, tokens, cómo actualizar el maestro, bitácora de sesiones).

---

## Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| **Frontend** | HTML + Vanilla JS + TailwindCSS CDN | Un solo archivo, sin build step, sin bundler |
| **Diseño** | Material Design 3 (colores, tokens) | Sistema de diseño coherente, adaptable a dark mode |
| **Fuente de datos (clientes)** | JSON en Google Drive, servido por Apps Script con token (JSONP) | El maestro incluye ventas por cliente (dato sensible): NO va al repo público |
| **Origen del maestro** | DuckDB (`friosur_analytics.duckdb`) → `generar_maestro_desde_duckdb.py` | Datos reales del ERP: vendedor, freezers, café, venta mes/3m, último pedido, top productos |
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
│  │  - Lista de ~466 clientes activos    │   │
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
│  Google Drive   │    │  Google Apps Script  │
│                 │◄───│   (Codigo.gs)        │
│ clientes_       │    │                      │
│ maestro.json    │    │ ?action=clientes     │
│ (~466, c/ventas)│    │   → JSONP + token    │
│  privado, token │    │ ?action=guardar      │
└─────────────────┘    └──────────────────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │    Google Sheets     │
                       │  "Auditorías"        │
                       │  (16 columnas)       │
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
├── index.html                       ← Toda la app (UI + JS + estilos inline)
├── manifest.json                    ← Config PWA (nombre, íconos, orientación)
├── sw.js                            ← Service Worker (caché offline, v5 network-first)
├── clientes_maestro.json            ← Maestro de clientes (~466, en .gitignore, va a Drive)
├── Codigo.gs                        ← Backend Google Apps Script (sirve maestro + guarda)
├── generar_maestro_desde_duckdb.py  ← Genera el maestro desde DuckDB
├── GENERAR_MAESTRO.bat              ← Doble clic: regenera el maestro con el .venv
├── ESTADO_PROYECTO.md               ← Documento de continuidad (config viva + bitácora)
├── icons/
│   ├── icon-192.png                 ← Ícono para Android
│   └── icon-512.png                 ← Ícono splash screen
├── DEPLOY.md                        ← Guía paso a paso para publicar
├── exportar_a_excel.py              ← Herramienta para exportar clientes
├── generar_app.py                   ← Script auxiliar de generación
└── generar_iconos.py                ← Genera los íconos PNG
```

---

## Datos de clientes (clientes_maestro.json)

Cada cliente tiene esta forma:

```json
{
  "idcli": 30003,
  "cliente": "CHAMORRO MARIA - CRISTINA (RG)",
  "nombre_comercio": "ALMACEN CRISTINA",
  "direccion": "10 E/ 21Y20 LOS ALAMOS",
  "ciudad": "RIO GALLEGOS",
  "idvend": "712",
  "freezers": ["2132889"],
  "cafe_maquinas": [],
  "ventas": {
    "ultima_compra": "2026-07-10",
    "venta_mes": 0.0,
    "venta_3m": 126573.05,
    "top_productos": [{ "producto": "LUXOR BOMBON FRIGOR 24 x 53g", "neto": 39708.6 }]
  }
}
```

> El vendedor sale de `customer.Collector` y las ventas se calculan como el neto
> facturado del ERP (`SUM(SubTotal) WHERE DocType IN (0,1)`). Detalle de reglas en
> `ESTADO_PROYECTO.md`.

Ciudades cubiertas: Río Gallegos, El Calafate, Río Turbio, 28 de Noviembre, Puerto San Julián, Piedrabuena, Gobernador Gregores, Puerto Santa Cruz, El Chaltén.

---

## Cómo se publica (deploy)

> Ver [DEPLOY.md](file:///g:/Mi%20unidad/AppAuditoria/DEPLOY.md) para la guía completa.

### Resumen en 4 pasos:

**1. GitHub (hosting del app-shell, SIN el maestro)**
```bash
git add index.html manifest.json sw.js icons/
git commit -m "App de auditoría Friosur"
git push
```
> `clientes_maestro.json` NO se sube al repo (está en `.gitignore`) porque incluye
> ventas por cliente. Vive en Google Drive y lo sirve el Apps Script con token.

**2. GitHub Pages** — Repo → Settings → Pages → Branch → Save.

**3. Google Apps Script (backend)**
- Google Sheet con hoja "Auditorías" → pegar `Codigo.gs` → setear `SPREADSHEET_ID`.
- Propiedades del script: `CLIENTES_FILE_ID` (ID del JSON en Drive) y `CLIENTES_TOKEN`.
- Implementar como Web App (acceso: cualquier persona) → copiar URL.

**4. Conectar la app** — En `index.html`, `CONFIG.SHEETS_API_URL` y
`CONFIG.CLIENTES_TOKEN` (debe coincidir con el del Apps Script). Push a GitHub.

> Valores vivos (URLs, IDs, token) documentados en `ESTADO_PROYECTO.md`.

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

## Cómo actualizar la lista de clientes (y sus ventas)

```
1. (Opcional) Correr la ETL del proyecto padre: actualizar_datos.bat
2. Doble clic en GENERAR_MAESTRO.bat  → regenera clientes_maestro.json desde DuckDB
3. En Google Drive, sobre el archivo que YA existe:
   clic derecho → Gestionar versiones → Subir nueva versión → elegir el JSON local
4. La app descarga el maestro (network-first) en la próxima apertura con conexión
```

> ⚠️ En Drive usar SIEMPRE "Subir nueva versión". Subirlo como archivo nuevo genera
> un File ID distinto y rompe la conexión (habría que actualizar `CLIENTES_FILE_ID`
> en el Apps Script). Ver `ESTADO_PROYECTO.md`.

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
