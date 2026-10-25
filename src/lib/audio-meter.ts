/**
 * Módulo de Captura Acústica de SIMORA
 * Utiliza Web Audio API para calcular decibeles relativos en el borde (Edge Device)
 * SIN almacenar ni transmitir grabaciones de audio (Privacidad garantizada).
 */

export interface AudioMeterController {
  start: () => Promise<void>;
  stop: () => void;
  getCurrentDecibels: () => number;
  isRunning: () => boolean;
}

export function createAudioMeter(onLevelChange?: (db: number) => void): AudioMeterController {
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrameId: number | null = null;
  let currentDb = 35; // base ambient
  let running = false;

  const processAudio = () => {
    if (!analyser || !running) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    // Calcular RMS (Root Mean Square)
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i];
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    // Convertir a escala relativa en dB SPL aproximada para espacios interiores
    // RMS estándar de micrófono de teléfono varía de 0.0001 (silencio) a ~0.5 (fuerte)
    // Usamos una calibración de referencia acústica: 20 * log10(rms) + factor de calibración (~95 dB)
    let calculatedDb = 32;
    if (rms > 0.00001) {
      const dbFs = 20 * Math.log10(rms);
      calculatedDb = Math.round((dbFs + 92) * 10) / 10;
    }

    // Delimitar a rangos acústicos físicos típicos (30 dB a 105 dB)
    currentDb = Math.max(30, Math.min(105, calculatedDb));

    if (onLevelChange) {
      onLevelChange(currentDb);
    }

    animationFrameId = requestAnimationFrame(processAudio);
  };

  const start = async () => {
    if (running) return;

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('La Web Audio API / getUserMedia no está disponible en este entorno.');
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;

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
  };

  return {
    start,
    stop,
    getCurrentDecibels: () => currentDb,
    isRunning: () => running,
  };
}
