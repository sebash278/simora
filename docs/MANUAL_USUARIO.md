# Manual de Usuario — SIMORA

Guía práctica para operar **SIMORA** desde dispositivos móviles u ordenadores de escritorio.

---

## 1. Navegación Principal

La aplicación cuenta con una barra inferior ergonómica dividida en cuatro módulos:

1. **Sensor:** Transforma el teléfono o computador en un nodo sensor acústico IoT.
2. **Monitoreo:** Panel de control en tiempo real con métricas agregadas, curva de evolución y semáforo por espacio.
3. **Historial:** Consulta filtrada por fechas y espacios, exportación de reportes (`.CSV` y `.JSON`) y reinicio controlado.
4. **Info:** Diagnóstico en vivo del motor de datos, criterios de la OMS y especificaciones de privacidad.

> **Nota de multitarea:** Puedes activar la transmisión en la pestaña **Sensor** y desplazarte libremente hacia **Monitoreo** o **Historial** sin que la captura del micrófono se detenga.

---

## 2. Uso del Nodo Sensor Móvil

### 2.1 Selección de modo y ubicación
1. En la esquina superior derecha de **Sensor**, elige entre:
   - **Micrófono:** Captura acústica real mediante el micrófono físico del dispositivo.
   - **Simulador:** Generador estocástico para pruebas de red cuando no se dispone de micrófono.
2. Selecciona el espacio físico donde te encuentras (*Salón 301*, *Biblioteca*, *Sala de Estudio B*, etc.).
3. Para registrar un salón adicional, pulsa **+ Nuevo espacio**, escribe su nombre, elige su categoría (*Biblioteca*, *Estudio*, *Aula*, *Común*) y pulsa **Agregar**.

### 2.2 Activación y permisos del micrófono
1. Pulsa **Activar Sensor Móvil**.
2. El navegador solicitará permiso para usar el micrófono; selecciona **Permitir**.
3. Si el permiso fue bloqueado previamente:
   - Toca el ícono de candado o ajustes junto a la barra de direcciones del navegador.
   - Activa el permiso **Micrófono** y vuelve a pulsar **Activar Sensor Móvil**.
   - Recuerda que en dispositivos móviles fuera de `localhost`, el navegador exige acceder mediante una dirección segura **`https://`**.

### 2.3 Calibración acústica y ajustes del nodo
Despliega la tarjeta **Calibración acústica y ajustes del nodo** para:
- **Compensación de micrófono (`-15 dB` a `+15 dB`):** Ajusta la sensibilidad particular del micrófono de tu teléfono frente a un sonómetro de referencia.
- **Calibrar silencio ambiental actual (`38.0 dB`):** Con el micrófono activo en un recinto silencioso, pulsa este botón para nivelar automáticamente el piso acústico del dispositivo.
- **Intervalo de envío:** Configura la frecuencia de reporte IoT en `1.0 s`, `2.5 s` o `5.0 s`.
- **Nombre identificativo del sensor:** Asigna un alias legible (por ejemplo, `Nodo Mesa Norte`) para identificar tus paquetes en el historial.

---

## 3. Monitoreo en Tiempo Real

En la pestaña **Monitoreo** encontrarás:
- **Filtro superior por espacio:** Visualiza las métricas globales de todo el campus o toca un espacio específico para aislar su comportamiento.
- **Indicadores clave (KPIs):** Promedio ponderado en dB, pico máximo registrado y número de alertas acumuladas.
- **Límite de Alerta Acústica:** Deslizador interactivo (`45 dB` a `85 dB`) que actualiza instantáneamente la línea punteada de referencia y el conteo de alertas.
- **Evolución de Ruido (Sparkline):** Toca o pasa el cursor sobre cualquier punto de la curva para inspeccionar el valor exacto en dB y la hora del registro.
- **Distribución OMS:** Proporción porcentual de lecturas en estado *Silencioso*, *Moderado* y *Ruidoso*.

---

## 4. Consulta Histórica y Exportación de Datos

En la pestaña **Historial**:
1. **Filtro rápido de estado:** Alterna entre **Todas** las lecturas o únicamente **Alertas**.
2. **Filtro temporal y espacial:**
   - Elige entre **Recientes**, **1 hora**, **Hoy** o **Fechas** (seleccionando el rango exacto *Desde* y *Hasta*).
   - Filtra por un salón específico desde el selector desplegable.
3. **Descarga de reportes:**
   - Pulsa **CSV** para descargar una hoja de cálculo compatible con Microsoft Excel, Google Sheets, Python o R (codificada en UTF-8 con BOM para preservar tildes).
   - Pulsa el botón **JSON** para obtener un respaldo estructurado de las lecturas filtradas.
