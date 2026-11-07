# Manual de Instalación y Despliegue — SIMORA

Instrucciones técnicas para instalar, configurar la base de datos relacional MySQL y desplegar **SIMORA** en entornos locales y en la nube con HTTPS.

---

## 1. Requisitos Previos

- **Node.js:** Versión `20.9.0` o superior (`node -v`).
- **Gestor de paquetes:** `npm` (incluido con Node.js).
- **Base de datos (Opcional en local, recomendada en producción):**
  - **MySQL 8.0+** (mediante Docker Desktop o instalación nativa de MySQL Server).
  - *Nota:* Si MySQL no está en ejecución, SIMORA opera automáticamente sobre su almacén local resiliente (`.simora_storage.json`) sin requerir configuración adicional.

---

## 2. Instalación Local Rápida

1. Clonar el repositorio e ingresar al directorio del proyecto:
   ```bash
   git clone https://github.com/sebash278/simora.git
   cd simora
   ```

2. Instalar las dependencias y generar el cliente de Prisma:
   ```bash
   npm install
   npm run db:generate
   ```

3. Copiar el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```

---

## 3. Configuración de Base de Datos MySQL

### Opción A: Contenedor MySQL con Docker Compose (Costo $0)
El repositorio incluye un archivo `docker-compose.yml` preconfigurado con MySQL 8.0:

```bash
docker compose up -d
```

Una vez levantado el contenedor en el puerto `3306`, aplica las migraciones relacionales y carga los espacios iniciales:

```bash
npm run db:migrate
npm run db:seed
```

### Opción B: Instancia MySQL existente (Local o Cloud)
Edita la variable `DATABASE_URL` en el archivo `.env` apuntando a tu servidor MySQL (por ejemplo, MySQL Workbench local, Railway MySQL, Aiven o PlanetScale):

```env
DATABASE_URL="mysql://USUARIO:PASSWORD@HOST:3306/simora_db"
```

Luego ejecuta:
```bash
npm run db:migrate
npm run db:seed
```

Para explorar visualmente las tablas `spaces`, `devices` y `noise_readings`, puedes ejecutar:
```bash
npm run db:studio
```

---

## 4. Ejecución de la Aplicación

### Modo desarrollo:
```bash
npm run dev
```
Disponible en `http://localhost:3000`.

### Compilación y arranque de producción:
```bash
npm run build
npm run start
```

### Verificación de salud del sistema:
Visita `http://localhost:3000/api/health` para comprobar qué motor de persistencia está activo (`mysql-prisma` o `local-json`) y cuántos clientes SSE están suscritos.

---

## 5. Despliegue con HTTPS para Teléfonos Móviles

Por políticas de seguridad de los navegadores modernos (Chrome en Android y Safari en iOS), `navigator.mediaDevices.getUserMedia` **exige contexto seguro (`HTTPS`)** cuando se accede desde una dirección distinta a `localhost`.

### Despliegue en Nube (Vercel / Railway / Render)
1. Conecta el repositorio `https://github.com/sebash278/simora.git` al proveedor cloud elegido.
2. Configura la variable de entorno `DATABASE_URL` apuntando a tu base de datos MySQL en la nube.
3. Comando de construcción (*Build Command*):
   ```bash
   npm run build
   ```
4. El proveedor asignará automáticamente un certificado SSL/TLS (`https://...`), habilitando la captura del micrófono móvil desde cualquier red Wi-Fi o datos móviles.
