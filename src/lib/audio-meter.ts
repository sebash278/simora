/**
 * Módulo de Captura Acústica de SIMORA
 * Utiliza Web Audio API para calcular decibeles relativos (RMS) y espectro FFT en el borde (Edge Device)
 * SIN almacenar ni transmitir grabaciones de audio (Privacidad por diseño - Zero-Recording).
 */

export interface AudioMeterController {
  start: () => Promise<void>;
  stop: () => void;
  getCurrentDecibels: () => number;
  getRawDecibels: () => number;
  setCalibrationOffset: (offsetDb: number) => void;
  getCalibrationOffset: () => number;
  isRunning: () => boolean;
}

const SPECTRUM_BANDS = 18;

export function createAudioMeter(
  onLevelChange?: (db: number, spectrumBands: number[], rawDb: number) => void,
  initialOffsetDb = 0
): AudioMeterController {
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrameId: number | null = null;

  let calibrationOffset = Math.max(-15, Math.min(15, initialOffsetDb));
  let rawDb = 36;
  let currentDb = 36;
  let smoothedRawDb = 36;
  let hasInitialSample = false;
  let running = false;

  let timeDomainBuffer: Float32Array<ArrayBuffer> | null = null;
  let frequencyBuffer: Uint8Array<ArrayBuffer> | null = null;

  const extractSpectrumBands = (): number[] => {
    if (!analyser || !frequencyBuffer) {
      return new Array(SPECTRUM_BANDS).fill(0.1);
    }

    analyser.getByteFrequencyData(frequencyBuffer);
    // Concentrarse en los primeros ~75% de bins útiles para voz y ruido interior
    const usableBins = Math.max(SPECTRUM_BANDS, Math.floor(frequencyBuffer.length * 0.72));
    const binsPerBand = Math.max(1, Math.floor(usableBins / SPECTRUM_BANDS));
    const bands: number[] = [];

    for (let b = 0; b < SPECTRUM_BANDS; b++) {
      const startIdx = b * binsPerBand;
      const endIdx = Math.min(frequencyBuffer.length, startIdx + binsPerBand);
      let sum = 0;
      let count = 0;
      for (let k = startIdx; k < endIdx; k++) {
        sum += frequencyBuffer[k];
        count++;
      }
      const avgByte = count > 0 ? sum / count : 0;
      bands.push(Math.min(1, Math.max(0.06, avgByte / 230)));
    }

    return bands;
  };

  const processAudio = () => {
    if (!analyser || !running || !timeDomainBuffer) return;

    analyser.getFloatTimeDomainData(timeDomainBuffer);

    // Calcular RMS (Root Mean Square)
    let sumSquares = 0;
    const len = timeDomainBuffer.length;
    for (let i = 0; i < len; i++) {
      const val = timeDomainBuffer[i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / len);

    // Escala logarítmica relativa dB SPL aproximada: 20 * log10(rms) + referencia base (92 dB)
    let instantRawDb = 30;
    if (rms > 0.00001) {
      const dbFs = 20 * Math.log10(rms);
      instantRawDb = dbFs + 92;
    }

    // Suavizado exponencial (EMA) para lectura estable tipo sonómetro (ponderación rápida)
    if (!hasInitialSample) {
      smoothedRawDb = instantRawDb;
      hasInitialSample = true;
    } else {
      smoothedRawDb = smoothedRawDb * 0.78 + instantRawDb * 0.22;
    }

    rawDb = Math.round(Math.max(25, Math.min(115, smoothedRawDb)) * 10) / 10;
    const calibrated = rawDb + calibrationOffset;
    currentDb = Math.round(Math.max(25, Math.min(120, calibrated)) * 10) / 10;

    const bands = extractSpectrumBands();

    if (onLevelChange) {
      onLevelChange(currentDb, bands, rawDb);
    }

    animationFrameId = requestAnimationFrame(processAudio);
  };

  const start = async () => {
    if (running) return;

    if (typeof window === 'undefined') {
      throw new Error('Entorno de navegador no disponible.');
    }

    if (!window.isSecureContext) {
      throw new Error(
        'Conexión no segura (HTTP): El navegador exige HTTPS o localhost para habilitar el micrófono.'
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'La API de captura de audio (getUserMedia) no está soportada en este navegador.'
      );
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
    } catch (err: unknown) {
      const domErr = err as { name?: string; message?: string };
      if (domErr?.name === 'NotAllowedError' || domErr?.name === 'PermissionDeniedError') {
        throw new Error(
          'Permiso de micrófono denegado. Habilita el acceso al micrófono en el ícono de candado de la barra de direcciones.'
        );
      }
      if (domErr?.name === 'NotFoundError' || domErr?.name === 'DevicesNotFoundError') {
        throw new Error('No se detectó ningún micrófono físico conectado en este dispositivo.');
      }
      if (domErr?.name === 'NotReadableError' || domErr?.name === 'TrackStartError') {
        throw new Error(
          'El micrófono está siendo utilizado de forma exclusiva por otra aplicación.'
        );
      }
      throw new Error(domErr?.message || 'No se pudo iniciar la captura de audio.');
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.55;

    timeDomainBuffer = new Float32Array(analyser.fftSize);
    frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);
    hasInitialSample = false;

    source.connect(analyser);
    running = true;

    processAudio();
  };

  const stop = () => {
    running = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
    timeDomainBuffer = null;
    frequencyBuffer = null;
  };

  return {
    start,
    stop,
    getCurrentDecibels: () => currentDb,
    getRawDecibels: () => rawDb,
    setCalibrationOffset: (offsetDb: number) => {
      calibrationOffset = Math.round(Math.max(-15, Math.min(15, offsetDb)) * 10) / 10;
    },
    getCalibrationOffset: () => calibrationOffset,
    isRunning: () => running,
  };
}
