# Manual del Sistema — SIMORA

**Sistema de Monitoreo de Ruido Ambiental mediante Sensores Móviles (IoT)**  
**Institución:** Fundación Universitaria Compensar (2026)  
**Autores:** Sebastian Hernandez Pinzon · Samuel Felipe Barbosa Ríos  

---

## 1. Visión Arquitectónica (Edge-to-Cloud)

SIMORA implementa una arquitectura distribuida de cuatro capas que convierte teléfonos inteligentes y navegadores modernos en nodos sensores acústicos de borde (*Edge Nodes*), eliminando el costo de adquisición de microcontroladores físicos y preservando la privacidad de los ocupantes.

```mermaid
flowchart LR
  subgraph Edge["Capa Edge (Dispositivo Móvil)"]
    Mic["Micrófono / Simulador"] --> AudioAPI["Web Audio API (FFT 1024 + RMS)"]
    AudioAPI --> Cal["Calibración Relativa (±15 dB)"]
  end

  subgraph Backend["Capa de Ingesta y Tiempo Real (Next.js 16)"]
    API["API REST (/api/readings, /api/spaces)"]
    Hub["RealtimeHub (Pub/Sub SSE)"]
  end

  subgraph Data["Capa de Persistencia Híbrida"]
    Prisma["Prisma ORM + MySQL 8.0"]
    Fallback["Almacén Local Resiliente (.simora_storage.json)"]
  end

  subgraph Client["Capa de Visualización"]
    Dash["Dashboard Mobile-First"]
    Export["Reportes CSV / JSON"]
  end

  Cal -- "POST JSON (HTTPS)" --> API
  API --> Prisma
  API -. "Conmutación automática" .-> Fallback
  API --> Hub
  Hub -- "GET /api/stream (SSE)" --> Dash
  Dash --> Export
```

---

## 2. Procesamiento Acústico en el Borde y Privacidad

El archivo `src/lib/audio-meter.ts` procesa la señal acústica íntegramente en la memoria volátil del navegador:

1. **Captura sin filtros distorsionantes:** Se solicita `navigator.mediaDevices.getUserMedia` desactivando `echoCancellation`, `noiseSuppression` y `autoGainControl` para conservar la presión sonora real captada por el micrófono.
2. **Cálculo del Valor Eficaz (RMS):** Sobre una ventana de `fftSize = 1024` muestras en dominio temporal ($x_i \in [-1, 1]$):
   $$\text{RMS} = \sqrt{\frac{1}{N}\sum_{i=1}^{N} x_i^2}$$
3. **Conversión Logarítmica y Suavizado Exponencial:**
   $$L_{\text{raw}} = 20 \cdot \log_{10}(\text{RMS}) + 92\text{ dB}$$
   Se aplica un filtro de media móvil exponencial ($\alpha = 0.22$) seguido del factor de compensación del dispositivo ($\Delta_{\text{cal}} \in [-15, +15]\text{ dB}$):
   $$L_{\text{final}} = \text{clamp}(L_{\text{suavizado}} + \Delta_{\text{cal}}, 25, 120)$$
4. **Análisis Espectral FFT:** Se agrupan las componentes de frecuencia en 18 bandas normalizadas para alimentar el vúmetro dinámico.
5. **Garantía Zero-Recording:** Ningún fragmento PCM ni grabación de voz es almacenado en disco ni transmitido por red; únicamente viaja el escalar numérico en decibeles.

---

## 3. Modelo de Datos Relacional (MySQL + Prisma ORM)

El esquema relacional definido en `prisma/schema.prisma` consta de tres entidades principales indexadas para consultas temporales y espaciales:

```mermaid
erDiagram
  SPACE ||--o{ NOISE_READING : "registra"
  DEVICE ||--o{ NOISE_READING : "emite"

  SPACE {
    varchar id PK
    varchar name UK
    varchar category
    float recommended_threshold
    datetime created_at
  }

  DEVICE {
    varchar id PK
    varchar name
    float calibration_offset
    datetime created_at
    datetime last_seen_at
  }

  NOISE_READING {
    varchar id PK
    varchar device_id FK
    varchar device_name
    varchar space_id FK
    varchar location
    float decibels
    varchar classification
    boolean is_alert
    datetime timestamp
  }
```

### Resiliencia Operativa (Conmutación Automática)
El módulo `src/lib/prisma.ts` verifica la disponibilidad del servidor MySQL con un tiempo límite de `1.5 s`. Si el motor MySQL no está accesible en entornos locales de evaluación rápida, `src/lib/storage.ts` conmuta de manera transparente hacia `.simora_storage.json` sin interrumpir la captura ni el monitoreo.

---

## 4. Referencia de Endpoints (API REST + SSE)

| Método | Ruta | Descripción | Parámetros Principales |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/readings` | Consulta lecturas históricas ordenadas descendentemente. | `limit`, `location`, `classification`, `deviceId`, `from`, `to`, `alertsOnly`, `threshold` |
| `POST` | `/api/readings` | Ingesta una lectura acústica validada (0–140 dB) y notifica por SSE. | Body JSON: `deviceId`, `deviceName`, `location`, `decibels`, `calibrationOffset`, `alertThreshold` |
| `DELETE` | `/api/readings` | Restablece el historial al conjunto de datos base. | Ninguno |
| `GET` | `/api/stats` | Calcula KPIs agregados y distribución OMS. | `location`, `from`, `to`, `threshold` |
| `GET` | `/api/spaces` | Lista los espacios monitoreados registrados. | Ninguno |
| `POST` | `/api/spaces` | Registra un nuevo espacio físico de monitoreo. | Body JSON: `name`, `category` (`Biblioteca`, `Estudio`, `Aula`, `Común`) |
| `GET` | `/api/stream` | Canal Server-Sent Events (SSE) para telemetría en tiempo real. | Emite eventos `connected`, `reading:new`, `space:new`, `reading:reset` |
| `GET` | `/api/health` | Diagnóstico operativo del motor de persistencia y clientes SSE activos. | Ninguno |

---

## 5. Criterios de Clasificación Acústica (Directrices OMS)

- **Silencioso (`< 50 dB`):** Confort óptimo para bibliotecas, lectura y concentración profunda.
- **Moderado (`50 dB – 70 dB`):** Actividad académica participativa habitual sin riesgo auditivo.
- **Ruidoso (`> 70 dB`):** Nivel de disconfort acústico, interferencia en la comunicación y fatiga auditiva.
