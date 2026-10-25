# SIMORA · Sistema de Monitoreo de Ruido Ambiental

> **Asignatura:** Internet de las Cosas (IoT)  
> **Institución:** Fundación Universitaria Compensar (2026)  
> **Autores:** Sebastian Hernandez Pinzon · Samuel Felipe Barbosa Ríos  
> **Docente:** John Jaime Ruiz Guzman  

---

## 1. Descripción del Sistema

**SIMORA** es un sistema de monitoreo de ruido ambiental basado en principios de Internet de las Cosas (IoT) que transforma dispositivos móviles y ordenadores en nodos sensores de borde (Edge Nodes) a costo $0.

Permite medir y vigilar en tiempo real el clima acústico en salones de clase, bibliotecas y salas de estudio, promoviendo el bienestar auditivo y el cumplimiento de las normativas de la Organización Mundial de la Salud (OMS).

---

## 2. Arquitectura del Sistema (Edge-to-Cloud)

1. **Módulo de Captura en el Borde (Edge Device):**
   - Acceso al micrófono mediante la **Web Audio API** del navegador sin librerías externas pesadas.
   - Cálculo en tiempo real de decibeles relativos ponderados (**RMS - Root Mean Square**) en memoria local.
   - **Privacidad estricta (Zero-Recording):** el stream de audio se analiza en memoria volátil y se descarta de inmediato; nunca se graba, almacena ni transmite voz o sonido por la red.
   - **Modo Simulador IoT:** generador de ruido estocástico integrado para pruebas y evaluación de red sin depender de permisos de audio.

2. **Capa de Ingesta y API (Backend Next.js):**
   - Endpoint `POST /api/readings`: validación de rango (0–140 dB), categorización de confort y registro de telemetría.
   - Endpoint `GET /api/readings`: consulta con filtros por espacio y clasificación acústica.
   - Endpoint `GET /api/stats`: cálculo instantáneo de KPIs (promedio global, picos máximos, distribución porcentual OMS y contador de alertas).
   - Endpoint `DELETE /api/readings`: reinicio controlado del histórico a la semilla inicial.

3. **Módulo de Visualización y Monitoreo (Dashboard Mobile-First):**
   - Interfaz minimalista de instrumentación acústica (paleta Obsidian Dark).
   - Vúmetro en tiempo real con micro-barras de espectro dinámico y cifras numéricas tabulares.
   - Gráfica sparkline vectorial de evolución continua con umbral de alerta configurable.
   - Barra de distribución del clima acústico según estándares de la OMS.
   - Exportación de telemetría a formato CSV para auditoría y toma de decisiones.

---

## 3. Requisitos e Instalación

### Requisitos previos:
- Node.js 18+ (recomendado Node 20 o 22)
- Navegador web moderno con soporte para Web Audio API (Chrome, Safari, Edge, Firefox)

### Puesta en marcha:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en el navegador.

3. **Compilación para producción:**
   ```bash
   npm run build
   npm run start
   ```

---

## 4. Estándares Acústicos de Referencia (OMS)

| Rango de Nivel Sonoro | Clasificación | Entorno Típico | Impacto Acústico |
| :--- | :--- | :--- | :--- |
| **< 50 dB** | Silencioso | Biblioteca / Sala de lectura | Confort óptimo para estudio y concentración |
| **50 dB – 70 dB** | Moderado | Aula de clase participativa | Actividad normal sin riesgo acústico |
| **> 70 dB** | Ruidoso / Alerta | Cafetería / Zonas de tráfico | Disconfort, interferencia y fatiga auditiva |
