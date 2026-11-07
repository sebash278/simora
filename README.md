# SIMORA · Sistema de Monitoreo de Ruido Ambiental

> **Asignatura:** Internet de las Cosas (IoT)  
> **Institución:** Fundación Universitaria Compensar (2026)  
> **Autores:** Sebastian Hernandez Pinzon · Samuel Felipe Barbosa Ríos  
> **Docente:** John Jaime Ruiz Guzman  

---

## 1. Descripción del Sistema

**SIMORA** es una plataforma web Mobile-First basada en principios de Internet de las Cosas (IoT) que convierte teléfonos inteligentes y navegadores modernos en nodos sensores acústicos de borde (*Edge Nodes*) a costo $0.

Permite capturar, calibrar, transmitir y auditar en tiempo real el clima sonoro en bibliotecas, salas de estudio y aulas universitarias, promoviendo el bienestar acústico bajo las directrices de la Organización Mundial de la Salud (OMS).

---

## 2. Características Principales

- **Nodo Sensor Acústico en el Borde (Edge Computing):**
  - Procesamiento matemático instantáneo del valor eficaz (**RMS**) y análisis espectral **FFT de 18 bandas** mediante la **Web Audio API**.
  - **Privacidad por Diseño (Zero-Recording):** El audio se procesa en memoria volátil y se descarta al instante; jamás se graban ni transmiten voces o sonidos crudos.
  - **Calibración Acústica Relativa:** Compensación por dispositivo (`-15 dB` a `+15 dB`), nivelación automática de silencio ambiental (`38 dB`) e intervalos de envío configurables (`1.0 s`, `2.5 s`, `5.0 s`).
  - **Modo Simulador IoT:** Generador estocástico integrado para validación continua sin requerir permisos de hardware.
- **Telemetría en Tiempo Real (SSE) y API REST:**
  - Canal **Server-Sent Events (`/api/stream`)** para actualización instantánea del dashboard con respaldo automático HTTP.
  - Gestión dinámica de espacios monitoreados (`/api/spaces`), consulta histórica filtrada por rango de fechas (`/api/readings`) y diagnóstico de salud (`/api/health`).
- **Persistencia Relacional Híbrida (MySQL + Prisma ORM):**
  - Esquema normalizado para **MySQL 8.0** (`spaces`, `devices`, `noise_readings`) gestionado con **Prisma ORM**, con conmutación automática a almacenamiento local resiliente cuando se ejecuta sin servidor de base de datos externo.
- **Auditoría y Exportación de Datos:**
  - Filtrado por espacio, estado de alerta y rango de fechas (*Desde / Hasta*), con descarga directa en formatos **`.CSV`** (UTF-8 BOM compatible con Excel) y **`.JSON`**.

---

## 3. Inicio Rápido

```bash
# 1. Instalar dependencias y generar cliente Prisma
npm install
npm run db:generate

# 2. (Opcional) Levantar MySQL 8.0 con Docker y aplicar migraciones
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed

# 3. Iniciar aplicación
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 4. Endpoints Principales

| Método | Endpoint | Función |
| :--- | :--- | :--- |
| `GET` | `/api/readings` | Consulta lecturas con filtros (`location`, `from`, `to`, `alertsOnly`, `limit`) |
| `POST` | `/api/readings` | Registra telemetría desde un nodo sensor y publica por SSE |
| `DELETE` | `/api/readings` | Restablece el histórico al conjunto de datos inicial |
| `GET` | `/api/stats` | Obtiene KPIs acústicos y distribución porcentual OMS |
| `GET / POST` | `/api/spaces` | Lista o crea nuevos espacios físicos de monitoreo |
| `GET` | `/api/stream` | Flujo en vivo Server-Sent Events (SSE) |
| `GET` | `/api/health` | Estado operativo del motor de datos y clientes conectados |

---

## 5. Documentación Completa

- [Manual del Sistema (Arquitectura, Modelo ER y API)](./docs/MANUAL_SISTEMA.md)
- [Manual de Usuario (Operación Móvil, Calibración y Reportes)](./docs/MANUAL_USUARIO.md)
- [Manual de Instalación y Despliegue (MySQL, Docker y HTTPS)](./docs/MANUAL_INSTALACION.md)

---

## 6. Estándares Acústicos de Referencia (OMS)

| Rango de Nivel Sonoro | Clasificación | Entorno Típico | Impacto Acústico |
| :--- | :--- | :--- | :--- |
| **< 50 dB** | Silencioso | Biblioteca / Sala de lectura | Confort óptimo para estudio y concentración |
| **50 dB – 70 dB** | Moderado | Aula de clase participativa | Actividad normal sin riesgo acústico |
| **> 70 dB** | Ruidoso / Alerta | Cafetería / Zonas de tráfico | Disconfort, interferencia y fatiga auditiva |
