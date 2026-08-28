# 🚀 GUÍA DE DESPLIEGUE: GitHub → Hostinger → Node.js

Esta guía detalla el paso a paso para desplegar la plataforma **Desafío de Talento (BancoSol)** en un servicio de alojamiento **Hostinger** con soporte para **Node.js** (Cloud Hosting o VPS).

---

## 1. Requisitos Previos

1. Cuenta activa en **Hostinger** con plan **Cloud Hosting** o **VPS** (con soporte Node.js).
2. Repositorio en **GitHub** con este proyecto.
3. Node.js versión **18.x** o **20.x** (LTS).

---

## 2. Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de tu proyecto en el servidor con los siguientes valores:

```env
PORT=3000
NODE_ENV=production
ADMIN_USERNAME=reclutador
ADMIN_PASSWORD=bancosol
ADMIN_JWT_SECRET=tu_clave_secreta_super_segura_para_el_evento_2025
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
```

---

## 3. Despliegue en Hostinger (hPanel / Node.js)

### Paso A: Subir el código a GitHub
1. Inicializa tu repositorio y sube todo el código:
   ```bash
   git add .
   git commit -m "feat: plataforma completa de minijuegos con 7 juegos y panel admin"
   git push origin main
   ```

### Paso B: Configurar la aplicación Node.js en Hostinger hPanel
1. Inicia sesión en **hPanel de Hostinger**.
2. Ve a la sección **Avanzado** → **Node.js**.
3. Haz clic en **Crear Aplicación**:
   - **Versión de Node.js:** Selecciona `20.x` o `18.x`.
   - **Modo de Aplicación:** `Production`.
   - **Directorio Raíz de la Aplicación:** `public_html` (o la carpeta de tu subdominio, ej. `juegos`).
   - **Archivo de inicio:** `dist/server.cjs` (o `server.ts` con tsx).
4. Guarda la configuración.

### Paso C: Instalación y Build en el Servidor (SSH o Terminal de hPanel)
Conéctate por SSH al servidor o abre la terminal web integrada en hPanel y ejecuta:

```bash
# 1. Clonar el repositorio en la carpeta correspondiente
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git .

# 2. Instalar todas las dependencias
npm install

# 3. Compilar el cliente y servidor para producción
npm run build

# 4. Iniciar la aplicación
npm start
```

### Paso D: Configuración con PM2 (Recomendado para producción continua)
Para mantener el servidor Node.js ejecutándose 24/7 de forma ininterrumpida ante reinicios o picos de tráfico:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la aplicación con PM2
pm2 start dist/server.cjs --name "desafio-talento"

# Guardar la lista de procesos para auto-inicio
pm2 save
pm2 startup
```

---

## 4. Conexión con Google Sheets (Opcional pero Recomendado)

Para enviar cada participación en vivo a una hoja de cálculo de Google Drive:

1. Crea una nueva hoja de cálculo en **Google Sheets**.
2. Ve a **Extensiones** → **Apps Script**.
3. Pega el siguiente código en el editor:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Si la hoja está vacía, agregar encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Fecha",
        "Hora",
        "Nombre",
        "Celular",
        "Juego",
        "¿Ganó?",
        "Premio Asignado",
        "Código Canje",
        "Premio Entregado",
        "Duración (s)"
      ]);
    }
    
    var now = new Date();
    sheet.appendRow([
      Utilities.formatDate(now, "GMT-4", "yyyy-MM-dd"),
      Utilities.formatDate(now, "GMT-4", "HH:mm:ss"),
      data.name,
      data.phone,
      data.gameName,
      data.won ? "SÍ" : "NO",
      data.hasPrize ? (data.prizeType || "Kit Bienvenida") : "Sin premio",
      data.redeemCode || "-",
      data.prizeDelivered ? "SÍ" : "NO",
      data.durationSeconds || 0
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Haz clic en **Implementar** → **Nueva implementación**.
5. Selecciona tipo **Aplicación web**:
   - **Ejecutar como:** `Yo`.
   - **Quién tiene acceso:** `Cualquier usuario (Anyone)`.
6. Copia la **URL de la aplicación web** generada.
7. Pega esa URL en el **Panel de Reclutador** en la pestaña **Configuración y Juegos** o en la variable `GOOGLE_SHEETS_WEBHOOK_URL` de tu `.env`.

---

## 5. Acceso al Panel de Reclutador

- En la esquina superior derecha de la aplicación web, haz clic en el icono **🔒 Panel**.
- Credenciales iniciales:
  - **Usuario:** `reclutador`
  - **Contraseña:** `bancosol`
- Desde el panel podrás:
  - Ver el total de participantes, ganadores y premios entregados en tiempo real.
  - Activar o desactivar cualquiera de los 7 minijuegos.
  - Controlar el stock de premios restantes.
  - Editar preguntas y explicaciones de talento humano.
  - Descargar los reportes en formato **Excel (.xlsx)** y **CSV**.
