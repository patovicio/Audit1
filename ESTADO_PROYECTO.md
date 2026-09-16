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
    "top_productos": [{"producto": "...", "neto": 39708.6}],
    "saldo_vencido": 83523.16
  },
  "historial": {
    "ultimas_facturas": [
      {"nro": "124190159", "fecha": "2026-09-07", "neto": 581727.6, "con_iva": 721342.23, "es_nc": false}
    ],
    "frecuencia_dias": 7.2,
    "compras_recientes": 25,
    "cobranzas": {
      "fact_pagadas": 152, "dias_promedio_pago": 15.8, "dias_vs_vto": -5.2, "ultimo_cobro": "2026-09-14"
    },
    "comportamiento_pago": "puntual"
  }
}
```

Reglas de negocio aplicadas (respetan la directiva FrioSur):
- **Vendedor** = `customer.Collector` (NO `SalesMan`, que está vacío).
- **Neto facturado (como OO)** = `SUM(SubTotal) WHERE DocType IN (0,1)`.
- **Top productos** = `SUM(invoiceitemrow.RowNet)` (NO SubTotal post-JOIN), 90 días.
- **Saldo vencido** = `SUM(invoice.Saldo) WHERE OpenFlag=1 AND Saldo>0 AND DueDate < hoy` (con IVA).
- **Historial 360** (bloque `historial`):
  - `ultimas_facturas` = últimas 8 de `invoice` (DocType IN 0,1); NC de reparto marcadas `es_nc`.
  - `frecuencia_dias` = 180 / días distintos con compra en ventana 180 días (DocType=0, SubTotal>0).
  - `cobranzas` = vía `receiptinvoicerow` (InvoiceNr→invoice.SerNr, masterId→receipt.internalId):
    `dias_promedio_pago` (cobro − emisión), `dias_vs_vto` (cobro − vencimiento, negativo = paga antes).
    Solo crédito (`PayTerm<>'EF'`), pagos 0..365 días. `null` si nunca operó a crédito.
  - `comportamiento_pago`: 🟢 puntual (`dias_vs_vto<=0`) · 🟡 lento (1-10) · 🔴 moroso (>10 o con saldo vencido hoy).
- Clientes activos = `(Closed=0 OR NULL) AND GroupCode!='PERSO'`.
- Última corrida: 470 clientes activos, 458 con ventas, 30 con saldo vencido, datos al 15/09/2026.
  Comportamiento de pago: 334 puntual, 50 lento, 39 moroso, 47 sin crédito.

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

## 9. Informe de WhatsApp — formato MINIMALISTA (definitivo)

> ⚠️ El usuario definió este formato como el bueno: **lo ven directivos y gerentes
> todos los días.** Es sobrio y **minimalista** (pensado para leerse en el celular
> sin scroll de más). **NO** volver al formato "ejecutivo numerado"
> (`1 ·`, `2 ·`, resumen ejecutivo, `INFORME DE AUDITORÍA COMERCIAL`) — se probó y
> se descartó. **Tampoco** volver a los separadores `─────` entre secciones — se
> quitaron para acortar el mensaje (ver bitácora 2026-09-15).

Función `generarTextoWhatsApp()` en `index.html`. Estructura:

1. Encabezado (una línea por dato), con una línea en blanco tras la fecha:
   `🔵 *AUDITORÍA FRIOSUR*` / `📅 fecha corta (Vie 04 sep · 16:51 hs)` /
   `🏪 comercio` / `👤 razón social` / `📍 dirección · ciudad` /
   `🔢 #ID · Vend. XXX` / `💰 $venta · último dd/mm/aa` (venta y último pedido
   en **una sola línea**).
2. Secciones con emoji + título en negrita, **sin separadores** (helper `sec()`).
   Una línea en blanco separa cada sección:
   `🛡️ ACTIVOS FRIOSUR`, `📦 COBERTURA`, `💲 PRECIOS COMPETENCIA`,
   `⚔️ ACTIVOS COMPETENCIA`, `☕ SERVICIO MÁQUINA DE CAFÉ`,
   `🏷️ OFERTAS / PRECIOS ESPECIALES`, `📝 NOTAS`.
3. **Secciones vacías se OMITEN** (precios, activos competencia, café, ofertas,
   notas). Solo `ACTIVOS FRIOSUR` y `COBERTURA` aparecen siempre (núcleo de la
   auditoría; si no hay activos muestran `— Sin activos registrados`).
4. Estados de activos: ✅ OK · 🔴 discrepancia · 🔶 no registrado · ⏳ pendiente.
   Cobertura: 🟢 presente · 🔴 no encontrado. Bullets `•` en precios/competencia/ofertas.
5. Sin pie de firma (se sacó para dejarlo más limpio).

**Emojis:** definidos en el objeto `EMO` al inicio de `generarTextoWhatsApp()`,
por **escape Unicode** (`'\uD83D\uDD35'`...) para que no se corrompan según la
codificación del archivo. Venta del mes redondeada sin decimales; último pedido en
dd/mm/aa. Los campos de venta salen de `clienteSeleccionado.ventas` (via
`construirDatosReporte()`).

---

## 10. Verificación tras cambios de código

No hay build. Para validar que el JS de `index.html` no tiene errores de sintaxis:
```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];let ok=true;m.forEach((s,i)=>{try{new Function(s[1]);}catch(e){ok=false;console.log('Bloque '+i+' ERROR: '+e.message);}});console.log(ok?'OK':'ERRORES');"
```
Para `sw.js`: `node --check sw.js`.

---

## 11. Bitácora de sesiones

### 2026-09-15 (cont. 4) — Ficha 360° del cliente (historial compras + cobranzas)
- **Backend (`generar_maestro_desde_duckdb.py`):** nuevo bloque `historial` por
  cliente (queries validadas con el MCP DuckDB antes de codear):
  - `ultimas_facturas` (8): `invoice` DocType IN (0,1), NC de reparto marcadas `es_nc`.
  - `frecuencia_dias` (ventana 180 d, más representativa que la histórica).
  - `cobranzas`: liga recibo→factura vía `receiptinvoicerow`; calcula días de pago
    (cobro−emisión) y días vs vencimiento (cobro−DueDate). Solo crédito, 0..365 d.
  - `comportamiento_pago`: puntual/lento/moroso (moroso también si tiene saldo
    vencido hoy). Constantes `ULTIMAS_FACTURAS=8`, `VENTANA_FRECUENCIA=180`.
- **Frontend (`index.html`):** sección **"Historial 360°"** desplegable dentro del
  panel de ventas (`frmVentas`). Colapsada por defecto en cada cliente. Muestra:
  badge de pagador (color por clasificación), "compra cada X días", "paga en X días"
  + detalle vs vencimiento + último cobro, y lista de últimas facturas (NC en rojo
  con etiqueta). Funciones `renderizarHistorial()`, `toggleHistorial()`, objeto
  `PAGADOR_INFO`. Reutiliza `fmtPesos()`.
- **SW v7.** Validado: `py_compile` OK, JS OK, `node --check sw.js` OK. Maestro
  regenerado (470 clientes; 334 puntual / 50 lento / 39 moroso / 47 sin crédito).
- **PENDIENTE de publicar:** subir "nueva versión" del maestro a Drive (File ID
  `1HdG5W...`) + `git push origin master:main`.

### 2026-09-15 (cont. 3) — Fase 2 "Saldo vencido" COMPLETADA
- **Backend (`generar_maestro_desde_duckdb.py`):** nuevo paso 4b que calcula
  `saldo_vencido` por cliente desde `invoice` (regla dura: `OpenFlag=1 AND Saldo>0
  AND DueDate < current_date`; `Saldo` ya incluye IVA). Se agrega al bloque `ventas`
  del JSON como `saldo_vencido` (0.0 si el cliente no tiene deuda; campo siempre
  presente). Fuente confirmada vía MCP DuckDB: 30 clientes con saldo vencido.
- **Frontend (`index.html`), patrón idéntico a "Sin compra":**
  - Helper `conSaldoVencido(c)` = `c.ventas.saldo_vencido > 0`. Helper `montoCompacto()`
    para formatear el monto en el badge ($1,2M / $850k / $500).
  - Chip nuevo `Saldo vencido` en `#chipsActivo` → `filtrarPorActivo('saldovencido')`
    + rama en `filtrarClientes()`.
  - Badge en la tarjeta con color **`tertiary-container`** (distinto del rojo `error`
    de "Sin compra"), ícono `warning`, muestra el monto: `Deuda $XXk`. Borde
    `border-tertiary/60`. Prioridad de borde: saldo vencido > sin compra > visitado.
- **SW v6** (bump de caché; index.html igual es network-first).
- Validado: `py_compile` OK, JS OK, `node --check sw.js` OK. Maestro regenerado
  (470 activos, 30 con saldo vencido, datos al 15/09).
- **PENDIENTE de publicar:** subir "nueva versión" del `clientes_maestro.json` a
  Drive (File ID `1HdG5W...`, NUNCA archivo nuevo) + `git push origin master:main`.

### 2026-09-15 (cont. 2) — Filtro/resaltado "Sin compra" (Fase 1)
- **Chip "Sin compra"** en `#chipsActivo` → `filtrarPorActivo('sincompra')`.
  Filtra clientes con `ventas.venta_mes <= 0` (helper `sinCompraEnElMes(c)`).
- **Resaltado en la tarjeta**: badge rojo `Sin compra` (colores `error-container`/
  `on-error-container`, ya definidos en el tema) + borde `border-error/50` en la
  tarjeta del cliente. El badge va en la columna derecha, arriba del de activos.
- Todo en `index.html`, sin tocar el maestro (el dato `venta_mes` ya venía).
- **Fase 2 PENDIENTE — "Saldo vencido":** el maestro NO trae saldo/cuenta
  corriente. Para hacerlo hay que agregar una consulta en
  `generar_maestro_desde_duckdb.py` (tabla de cuenta corriente/vencimientos de la
  DuckDB, que está en `../02-data-engine/` fuera de este workspace) que calcule un
  campo `saldo_vencido` por cliente, sumarlo al JSON, y recién ahí agregar el chip
  + badge en la app (mismo patrón que "Sin compra").

### 2026-09-15 (cont.)
- **Lista de clientes acotada a Río Gallegos + chips por tipo de activo.**
  - La app ahora muestra **solo clientes de RIO GALLEGOS**. Filtro fijo en
    `filtrarClientes()` (constante `CIUDAD_FIJA = "RIO GALLEGOS"`). La carga inicial
    llama a `filtrarClientes()` en vez de `renderizarLista(clientes)` para que el
    filtro aplique desde el arranque.
  - Se **reemplazaron los chips de ciudad** (Todos, Río Gallegos, El Calafate, …)
    por chips de **tipo de activo**: `Todos` · `Cafetera` · `Freezer`. Contenedor
    `#chipsActivo`, clase `.chip-activo`, función `filtrarPorActivo(tipo)` con
    estado `activoFiltro` (`''` | `'cafe'` | `'freezer'`).
  - `Cafetera` = clientes con `cafe_maquinas.length > 0`; `Freezer` = clientes con
    `freezers.length > 0`; `Todos` = todos los de Río Gallegos. La búsqueda por
    texto sigue funcionando combinada con el chip activo.
  - Se eliminaron `filtrarPorCiudad()` y la variable `ciudadFiltro` (ya no se usan).
  - ⚠️ Si en el futuro se quiere volver a operar sobre otras ciudades, revisar
    `CIUDAD_FIJA` y los chips en `#chipsActivo`.

### 2026-09-15
- **Informe WhatsApp → formato MINIMALISTA** para que se lea mejor en el celular.
  Cambios en `generarTextoWhatsApp()`:
  - Se **quitaron los separadores `─────`** entre secciones. Ahora cada sección es
    solo emoji + título en negrita (helper `sec(emo, titulo)`), separada por una
    línea en blanco. Esto solo ahorra ~10-12 líneas.
  - Encabezado más compacto: `🔢 #ID · Vend. XXX` (antes `Cliente #ID · Vendedor`)
    y venta + último pedido en **una sola línea** (`💰 $monto · último dd/mm/aa`).
    Línea en blanco tras la fecha para que respire.
  - **Secciones vacías se omiten** (precios, activos competencia, café, ofertas,
    notas). `ACTIVOS FRIOSUR` y `COBERTURA` siguen apareciendo siempre.
  - Emojis por Unicode intactos, sin numeración, sin pie de firma (se respetó todo
    lo definido como intocable). JS validado OK.
  - ⚠️ **NO volver a meter los separadores `─────` ni a imprimir secciones vacías.**

### 2026-09-05
- **Formato del informe: DEFINITIVO = sobrio.** Se descartó el formato ejecutivo
  numerado (`1 ·`, `2 ·`, resumen ejecutivo, título institucional). El usuario
  aclaró que **lo leen directivos y gerentes a diario** y quiere el formato sobrio:
  encabezado con un dato por línea (🔵📅🏪👤📍🔢 + 💰 venta + 📅 último pedido) y
  separadores `─────` entre secciones con emoji+título, bullets `•`. Emojis siguen
  vía Unicode. Ver sección 9. (commit `0eaac77`)
- No volver a cambiar la estructura sin pedido explícito.

### 2026-09-04 (cont.)
- **Emojis SÍ van en el informe.** El problema no era WhatsApp (los soporta) sino
  que al guardar el archivo con codificación no-UTF-8 los emojis literales se
  corrompían en el fuente (`✅ 🔴 🟢` → `�`). **Solución definitiva:** objeto `EMO`
  en `generarTextoWhatsApp()` con todos los emojis definidos por **escape Unicode**
  (`'\uD83D\uDCCB'`, etc.) en vez de pegar el carácter. Así nunca se corrompen sin
  importar la codificación del editor. (commit `30abc5d`)
  - ⚠️ **NO volver a quitar los emojis ni pasarlos a `[OK]`/`[!]`.** El usuario los
    quiere. Si alguno se ve mal, revisar el escape Unicode en `EMO`, no eliminarlo.
  - Intento previo con marcadores de texto (`[OK]`, `[!]`, `[EXTRA]`, `[PEND.]`)
    fue revertido a pedido del usuario. (commit descartado `718324b`)
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

## 11.b. Fase 2 "Saldo vencido" — ✅ COMPLETADA (2026-09-15 cont. 3)

> Implementada en código y validada. **Solo falta publicar** (subir maestro a Drive
> + `git push origin master:main`). Detalle en la bitácora del 2026-09-15 (cont. 3).
> El campo `ventas.saldo_vencido` ya sale del generador y la app tiene chip + badge.

<details>
<summary>Notas originales de planificación (referencia histórica)</summary>

**Estado actual (lo que YA funciona):**
- App muestra solo Río Gallegos. Chips: `Todos · Cafetera · Freezer · Sin compra`.
- "Sin compra" = `ventas.venta_mes <= 0`. Badge rojo + borde rojo en la tarjeta.
- El maestro (`clientes_maestro.json`) lo genera `generar_maestro_desde_duckdb.py`
  desde `../02-data-engine/friosur_analytics.duckdb` (read-only). Bloque `ventas`
  por cliente: `ultima_compra`, `venta_mes`, `venta_3m`, `top_productos`.
- El maestro **NO** tiene saldo ni cuenta corriente. Eso es lo que falta.

**Pasos concretos para la Fase 2:**

1. **Encontrar la fuente del saldo vencido** en la DuckDB (o en SQL Server, si la
   ETL la trae de ahí). Inspeccionar tablas candidatas de cuenta corriente /
   cuentas por cobrar / vencimientos. Comandos útiles (read-only):
   ```python
   import duckdb
   con = duckdb.connect(r"..\02-data-engine\friosur_analytics.duckdb", read_only=True)
   print(con.execute("SHOW TABLES").fetchall())
   # buscar tablas tipo: cuenta_corriente, saldos, account*, receivable, vencim*
   # inspeccionar columnas de la candidata:
   print(con.execute("DESCRIBE <tabla_candidata>").fetchall())
   ```
   Se necesita, por cliente: importe impago + fecha de vencimiento (para filtrar
   `vencimiento < hoy`). Confirmar la columna que liga al cliente (probablemente
   `CustCode`/`cliente_codigo`, igual que en `invoice`/`ext_freezers`).

2. **Agregar la consulta en `generar_maestro_desde_duckdb.py`** (junto al paso 4 de
   ventas). Armar un `saldo_map[CustCode] = suma de impago vencido`. Ejemplo de la
   forma esperada (ajustar nombres reales de tabla/columnas):
   ```sql
   SELECT CustCode, SUM(<importe_pendiente>) AS saldo_vencido
   FROM <tabla_cta_cte>
   WHERE <fecha_vencimiento> < current_date
     AND <importe_pendiente> > 0
   GROUP BY CustCode
   ```

3. **Sumar el campo al JSON.** Recomendado: dentro del bloque `ventas`, agregar
   `"saldo_vencido": round(float(...), 2)` (0.0 si el cliente no está en el map).
   Mantiene el contrato y la app lo lee igual que `venta_mes`.

4. **En `index.html` (mismo patrón que "Sin compra"):**
   - Helper: `function conSaldoVencido(c){ return (c?.ventas?.saldo_vencido||0) > 0; }`
   - Chip nuevo en `#chipsActivo`: `filtrarPorActivo('saldovencido')` y en
     `filtrarClientes()` agregar `else if (activoFiltro==='saldovencido') f = f.filter(conSaldoVencido);`
   - Badge en la tarjeta (usar color de alerta, p.ej. `tertiary`/`error` para
     distinguirlo del rojo de "Sin compra"). Ícono sugerido: `payments` o `warning`.
   - Opcional: mostrar el monto del saldo vencido en el badge o en la ficha del
     cliente al seleccionarlo.

5. **Regenerar y publicar:**
   - Correr `GENERAR_MAESTRO.bat` → subir "nueva versión" del JSON a Drive (mantener
     File ID `1HdG5W33zP8jafrL0XhXpHAWXYb85HmAz`, NUNCA como archivo nuevo).
   - Validar el JS: comando de la sección 10.
   - `git push origin master:main` para publicar el cambio de la app.

> Referencia del código ya hecho para "Sin compra" (patrón a copiar): helper
> `sinCompraEnElMes()`, chip en `#chipsActivo`, rama en `filtrarClientes()`, y
> `sinCompraBadge` + `border-error/50` en `renderizarLista()` de `index.html`.

</details>

---

## 12. Pendientes / ideas

- [ ] (Opcional) Script que suba el maestro a Drive automáticamente sobre el mismo
      File ID (API de Google Drive + credencial de servicio). Evitaría el paso
      manual de "Subir nueva versión". Requiere setup inicial de credenciales.
- [ ] Confirmar que la ETL DuckDB corre antes de generar el maestro si se quieren
      datos 100% al día (hoy depende de `actualizar_datos.bat`).
