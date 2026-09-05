# App Auditoría Friosur — Estado del Proyecto (documento de continuidad)

> **Leé esto AL INICIO de cada sesión.** Resume qué es la app, cómo está armada,
> la configuración crítica (IDs/tokens/URLs), cómo actualizar los datos y qué se
> hizo en cada sesión. Objetivo: no arrancar de cero nunca.

---

## 1. Qué es

PWA **single-file** para auditoría comercial en campo (vendedores/auditores de
Friosur visitan clientes en la Patagonia). Toda la lógica vive en `index.html`.
Sin frameworks, sin build, sin bundler. Backend = Google Apps Script + Google
Sheets + Google Drive. Hosting = GitHub Pages.

En cada visita se registra: activos Friosur (freezers/máquinas café), cobertura
de productos (Marfrig/Froneri), precios y activos de la competencia, servicio de
máquina de café, ofertas, notas y fotos. Al finalizar se genera un **informe para
WhatsApp** y se guarda en Google Sheets (con cola offline).

---

## 2. Restricciones duras (NO violar)

- **NO** React/Vue/Angular/Next.js/Vite/Webpack ni ningún framework/bundler.
- **NO** `package.json` ni dependencias npm.
- Todo el JS va dentro del `<script>` de `index.html` (single-file).
- **Vanilla JS ES6+** · **TailwindCSS por CDN** · Material Symbols + Inter por CDN.
- Reglas completas en `.agents/AGENTS.md` y `.cursorrules`.

---

## 3. Arquitectura y flujo de datos

```
DuckDB (friosur_analytics.duckdb)
   │  generar_maestro_desde_duckdb.py  (GENERAR_MAESTRO.bat)
   ▼
clientes_maestro.json  (LOCAL, en .gitignore — datos comerciales sensibles)
   │  subir "Nueva versión" a Google Drive (mantiene File ID)
   ▼
Google Drive (archivo maestro)
   │  Apps Script lee por File ID, valida token, sirve por JSONP
   ▼
App (index.html) descarga maestro:  ?action=clientes&token=...&callback=...
   │
   ├─ Guardar auditoría → Apps Script ?action=guardar → Google Sheets "Auditorías"
   └─ Informe WhatsApp  → wa.me / intent
```

- El maestro **NO** se sirve desde GitHub Pages (está en `.gitignore`) porque
  incluye ventas por cliente. Lo sirve el Apps Script desde Drive, con token.
- La carga usa **JSONP** (no fetch), porque Apps Script rompe CORS con un redirect.

---

## 4. Configuración crítica (valores vivos)

| Qué | Dónde | Valor |
|-----|-------|-------|
| Apps Script Web App URL | `index.html` `CONFIG.SHEETS_API_URL` | `https://script.google.com/macros/s/AKfycbwdFTYU9OPm6AI3CjIeWRa71wpaR1EcqyPxXQZQATwVsW6fholi08LC_aFKzMmJvvUL/exec` |
| Token del maestro | `index.html` `CONFIG.CLIENTES_TOKEN` **y** propiedad `CLIENTES_TOKEN` en Apps Script | `friosur-a7f3d9c2e1b4-2026` |
| File ID del maestro en Drive | propiedad `CLIENTES_FILE_ID` en Apps Script | `1HdG5W33zP8jafrL0XhXpHAWXYb85HmAz` |
| Spreadsheet ID (auditorías) | `Codigo.gs` `SPREADSHEET_ID` | `1Za8ZKGGn1jbQ-4QamXcv1PRKhTu_UYKK0pkJhCoZVwo` |
| Hoja de auditorías | `Codigo.gs` `SHEET_NAME` | `Auditorías` |
| Repo GitHub | remoto `origin` | `https://github.com/patovicio/Audit1.git` |

> **Rama local `master` → rama remota `main`.** Se pushea con
> `git push origin master:main`.

**El token debe coincidir en los dos lados** (index.html + Apps Script). Si se
rota, cambiarlo en ambos. Las **propiedades del script** se editan en
script.google.com → ⚙️ Configuración del proyecto → Propiedades del script
(no requiere re-implementar).

**URL de verificación del maestro** (pegar en navegador, debe empezar con `[{"idcli":`):
```
https://script.google.com/macros/s/AKfycbwdFTYU9OPm6AI3CjIeWRa71wpaR1EcqyPxXQZQATwVsW6fholi08LC_aFKzMmJvvUL/exec?action=clientes&token=friosur-a7f3d9c2e1b4-2026
```

---

## 5. Cómo actualizar los datos de clientes (venta del mes, último pedido, etc.)

1. (Opcional, para datos al día) Correr la ETL del proyecto padre: `actualizar_datos.bat`.
2. Doble clic en **`GENERAR_MAESTRO.bat`** → regenera `clientes_maestro.json`
   desde DuckDB (usa el `.venv` local, que tiene `duckdb` instalado).
3. En Google Drive: sobre el `clientes_maestro.json` **que ya existe**,
   clic derecho → **Gestionar versiones → Subir nueva versión** → elegir el JSON local.

> ⚠️ **NUNCA** subir el maestro como "archivo nuevo" (arrastrar/pegar). Eso genera
> un **File ID nuevo** y rompe la conexión: habría que actualizar `CLIENTES_FILE_ID`
> en el Apps Script. "Subir nueva versión" conserva el ID. (Esto ya pasó una vez —
> por eso el File ID actual es `1HdG5W...`).

La app baja el maestro **network-first**, así que al reabrirla con conexión toma
los datos nuevos.

---

## 6. Datos del maestro (estructura por cliente)

Generado por `generar_maestro_desde_duckdb.py` (DuckDB read-only). Cada cliente:

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
    "top_productos": [{"producto": "...", "neto": 39708.6}]
  }
}
```

Reglas de negocio aplicadas (respetan la directiva FrioSur):
- **Vendedor** = `customer.Collector` (NO `SalesMan`, que está vacío).
- **Neto facturado (como OO)** = `SUM(SubTotal) WHERE DocType IN (0,1)`.
- **Top productos** = `SUM(invoiceitemrow.RowNet)` (NO SubTotal post-JOIN), 90 días.
- Clientes activos = `(Closed=0 OR NULL) AND GroupCode!='PERSO'`.
- Última corrida: 466 clientes activos, 455 con ventas, datos hasta 05/09/2026.

---

## 7. Service Worker (caché)

`sw.js` — `CACHE_NAME = 'friosur-audit-v5'`.
- `index.html` y navegación → **network-first** (siempre baja la última versión
  publicada tras un deploy; fallback a caché si no hay red).
- Maestro (`action=clientes`) → **network-first** con fallback a caché.
- Resto (íconos, fuentes CDN) → **cache-first**.

> Al hacer cambios en `index.html`, subir `CACHE_NAME` (v6, v7...) solo si querés
> forzar limpieza total del caché. Con network-first ya no es obligatorio, pero
> ayuda si algún cliente quedó con caché corrupto.

---

## 8. Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `index.html` | Toda la app (UI + JS + estilos). Función del informe: `generarTextoWhatsApp()`. |
| `sw.js` | Service Worker (caché offline). |
| `manifest.json` | Config PWA. |
| `Codigo.gs` | Backend Apps Script (pegar en script.google.com; sirve maestro + guarda auditorías). |
| `clientes_maestro.json` | Maestro de clientes (LOCAL, en `.gitignore`). |
| `generar_maestro_desde_duckdb.py` | Genera el maestro desde DuckDB. |
| `GENERAR_MAESTRO.bat` | Doble clic → corre el generador con el `.venv`. |
| `.venv/` | Entorno Python local. Tiene `duckdb` instalado. |
| `resumen_proyecto.md` | Descripción general (más marketing/onboarding). |
| `.agents/AGENTS.md`, `.cursorrules` | Reglas duras de stack. |

---

## 9. Informe de WhatsApp — formato ejecutivo actual

Función `generarTextoWhatsApp()` en `index.html`. Estructura:

1. Encabezado institucional (`INFORME DE AUDITORÍA COMERCIAL` / `FRIOSUR S.R.L.` / fecha larga).
2. Bloque de identificación del cliente: comercio, razón social (si difiere),
   domicilio, `Cliente N° · Vendedor`, **Venta del mes**, **Último pedido**.
3. **Resumen ejecutivo** (▸ hallazgos: discrepancias, activos no registrados,
   cobertura faltante, activos de competencia; o "Sin novedades").
4. Secciones numeradas: `1 · ACTIVOS FRIOSUR`, `2 · COBERTURA`, `3 · PRECIOS
   COMPETENCIA`, `4 · ACTIVOS COMPETENCIA`, `5 · SERVICIO MÁQUINA CAFÉ`.
5. `OFERTAS / PRECIOS ESPECIALES` y `OBSERVACIONES` (si hay).
6. Pie: `_Generado desde App Auditoría Friosur_`.

Emojis solo semánticos de estado: ✅ 🔴 🟢 🔶 ⏳. Venta del mes redondeada sin
decimales; último pedido en dd/mm/aa. Los campos de venta salen de
`clienteSeleccionado.ventas` (via `construirDatosReporte()`).

---

## 10. Verificación tras cambios de código

No hay build. Para validar que el JS de `index.html` no tiene errores de sintaxis:
```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];let ok=true;m.forEach((s,i)=>{try{new Function(s[1]);}catch(e){ok=false;console.log('Bloque '+i+' ERROR: '+e.message);}});console.log(ok?'OK':'ERRORES');"
```
Para `sw.js`: `node --check sw.js`.

---

## 11. Bitácora de sesiones

### 2026-09-04 (cont.)
- **Emojis del informe rompían en algunos teléfonos** (`✅ 🔴 🟢 🔶 ⏳` → `�`).
  Reemplazados por marcadores de texto universales: `[OK]`, `[!]` (discrepancia /
  sin cobertura), `[EXTRA]` (no registrado), `[PEND.]`. Se ven igual en todos los
  dispositivos. (commit `718324b`)
- Nota: la 2ª línea del encabezado del informe quedó como `Patricio Bustamante-SUP.`
  (edición manual del usuario, respetada). Antes era `FRIOSUR S.R.L.`. Está en
  `generarTextoWhatsApp()` como texto fijo — cambiar ahí si se quiere otro rótulo.

### 2026-09-04
- **Informe WhatsApp → formato ejecutivo**: encabezado institucional, resumen
  ejecutivo de hallazgos, secciones numeradas 1-5, pie de firma. Reducidos los
  emojis a los semánticos. (commit `73ceeb6`)
- **SW v5 network-first** para `index.html`: evita servir HTML viejo tras deploy
  (el usuario veía el formato anterior por caché). (commit `257e408`)
- **Informe muestra Venta del mes + Último pedido** en el bloque del cliente,
  tomados de `clienteSeleccionado.ventas`. (commit `dda1987`)
- **Regenerado `clientes_maestro.json`** desde DuckDB (datos al 05/09). Instalado
  `duckdb` en el `.venv` local (no estaba). El JSON está en `.gitignore`.
- **Incidente Drive**: el maestro se re-subió como archivo nuevo → cambió el File
  ID → se actualizó `CLIENTES_FILE_ID` en Apps Script a `1HdG5W33zP8jafrL0XhXpHAWXYb85HmAz`.
  El `CLIENTES_TOKEN` no se tocó.
- **Creado `GENERAR_MAESTRO.bat`** (regenera el JSON con doble clic + recuerda
  subir "Nueva versión" a Drive). (commit `2fc9b28`)
- **Creado este `ESTADO_PROYECTO.md`.**

---

## 12. Pendientes / ideas

- [ ] (Opcional) Script que suba el maestro a Drive automáticamente sobre el mismo
      File ID (API de Google Drive + credencial de servicio). Evitaría el paso
      manual de "Subir nueva versión". Requiere setup inicial de credenciales.
- [ ] Confirmar que la ETL DuckDB corre antes de generar el maestro si se quieren
      datos 100% al día (hoy depende de `actualizar_datos.bat`).
