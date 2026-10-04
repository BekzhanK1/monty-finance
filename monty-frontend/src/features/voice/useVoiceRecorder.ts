import { useCallback, useEffect, useRef, useState } from 'react';

/** Long enough for "вчера 3000 продукты и 500 такси", short enough to keep transcription cheap. */
export const MAX_RECORDING_SECONDS = 30;

// iOS WebKit records only mp4/aac; Chromium/Android prefer webm/opus.
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export type RecorderStatus = 'idle' | 'recording' | 'unsupported' | 'denied' | 'error';

export interface Recording {
  blob: Blob;
  filename: string;
}

export function pickMimeType(isSupported: (type: string) => boolean): string | undefined {
  return MIME_CANDIDATES.find(type => isSupported(type));
}

export function filenameForMime(mime: string): string {
  if (mime.includes('mp4')) return 'voice.mp4';
  if (mime.includes('ogg')) return 'voice.ogg';
  return 'voice.webm';
}

export function isRecordingSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof window.MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * MediaRecorder wrapper: `start()` asks for the mic, `stop()` resolves with the recording.
 * Auto-stops after MAX_RECORDING_SECONDS; `onAutoStop` receives that recording.
 */
export function useVoiceRecorder(onAutoStop?: (recording: Recording) => void) {
  const [status, setStatus] = useState<RecorderStatus>(() => (isRecordingSupported() ? 'idle' : 'unsupported'));
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const resolveRef = useRef<((recording: Recording | null) => void) | null>(null);
  // Bumped by start/cancel so a mic permission prompt that resolves after cancel is discarded.
  const generationRef = useRef(0);
  const onAutoStopRef = useRef(onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null);
    return new Promise(resolve => {
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      setStatus('unsupported');
      return;
    }
    const generation = ++generationRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = pickMimeType(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const recording = blob.size > 0 ? { blob, filename: filenameForMime(type) } : null;
        cleanup();
        setStatus('idle');
        const resolve = resolveRef.current;
        resolveRef.current = null;
        if (resolve) {
          resolve(recording);
        } else if (recording) {
          onAutoStopRef.current?.(recording);
        }
      };

      recorder.start();
      setElapsed(0);
      setStatus('recording');
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(seconds);
        if (seconds >= MAX_RECORDING_SECONDS && recorder.state === 'recording') {
          recorder.stop();
        }
      }, 250);
    } catch (error) {
      if (generation !== generationRef.current) return;
      cleanup();
      const denied = error instanceof DOMException
        && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setStatus(denied ? 'denied' : 'error');
    }
  }, [cleanup]);

  /** Stop without delivering the recording (sheet closed mid-recording). */
  const cancel = useCallback(() => {
    generationRef.current += 1;
    const recorder = recorderRef.current;
    resolveRef.current = () => {};
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      resolveRef.current = null;
      cleanup();
    }
    setStatus(isRecordingSupported() ? 'idle' : 'unsupported');
  }, [cleanup]);

  useEffect(() => cancel, [cancel]);

  return { status, elapsed, start, stop, cancel };
}
