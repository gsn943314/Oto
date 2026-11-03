import React, { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../App';
import { AudioRecorder } from '../services/AudioRecorder';
import { ErrorType, type TriggerKey } from '../../shared/types';

interface RecordingControlProps {
  audioRecorder: AudioRecorder;
  onRecordingComplete: (audioBlob: Blob, duration: number, viaHotkey: boolean) => void;
  triggerKey?: TriggerKey;
}

export const TRIGGER_LABEL: Record<TriggerKey, string> = { control: '⌃ control', fn: 'fn', rightOption: '⌥ option', off: '' };

// The record button: a soft white bubble like the ones in the site's hero. Recording turns it ink with a ring
// that swells with your voice; while OpenAI works, an arc circles it.
export const RecordingControl: React.FC<RecordingControlProps> = ({ audioRecorder, onRecordingComplete, triggerKey = 'control' }) => {
  const { isRecording, isProcessing, setIsRecording, setError, setRecordingDuration, setTranscribedText, t } = useAppContext();
  const startTimeRef = useRef(0);
  // started from the trigger key in another app: the floating pill shows the progress and the text gets pasted
  const viaHotkeyRef = useRef(false);
  const startingRef = useRef(false);
  const ringRef = useRef<HTMLSpanElement>(null);

  // the clock
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
    }
    const id = setInterval(() => setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 200);
    return () => clearInterval(id);
  }, [isRecording, setRecordingDuration]);

  // the voice level, written straight onto the ring (no re-render per frame). A timer rather than
  // requestAnimationFrame: animation frames stop while the window is minimised or hidden, and the floating
  // indicators must keep moving then
  useEffect(() => {
    const stream = isRecording ? audioRecorder.getStream() : null;
    if (!stream) return;
    const ctx = new AudioContext();
    ctx.resume().catch(() => {}); // started from the trigger key there was no click, so it may begin suspended
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let level = 0, lastSent = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const rms = Math.min(1, Math.sqrt(sum / data.length) * 4);
      level += (rms - level) * 0.25;
      ringRef.current?.style.setProperty('--level', level.toFixed(3));
      const now = performance.now();
      if (viaHotkeyRef.current && audioRecorder.isRecording() && now - lastSent > 60) {
        lastSent = now;
        window.electronAPI.setOverlayState({ kind: 'recording', level, seconds: Math.floor((Date.now() - startTimeRef.current) / 1000) });
      }
    };
    const timer = setInterval(tick, 33);
    return () => {
      clearInterval(timer);
      ctx.close().catch(() => {});
    };
  }, [isRecording, audioRecorder]);

  const start = useCallback(async (viaHotkey = false) => {
    if (startingRef.current) return;
    startingRef.current = true;
    viaHotkeyRef.current = viaHotkey;
    try {
      setError(null);
      setTranscribedText(''); // each recording starts on a clean sheet
      if (viaHotkey) window.electronAPI.setOverlayState({ kind: 'recording', level: 0, seconds: 0 });
      await audioRecorder.startRecording();
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      const appError = error?.type ? error : { type: ErrorType.AUDIO_RECORDING_FAILED, message: error?.message ?? 'Failed to start recording' };
      setError(appError);
      setIsRecording(false);
      if (viaHotkey) window.electronAPI.setOverlayState({ kind: 'error', label: t.errorCopy[appError.type as ErrorType]?.status ?? t.status.error });
    } finally {
      startingRef.current = false;
    }
  }, [audioRecorder, setIsRecording, setError, setTranscribedText, t]);

  const stop = useCallback(async () => {
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const audioBlob = await audioRecorder.stopRecording();
      setIsRecording(false);
      onRecordingComplete(audioBlob, duration, viaHotkeyRef.current);
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      setError({ type: ErrorType.AUDIO_RECORDING_FAILED, message: error?.message || 'Failed to stop recording', details: error });
      setIsRecording(false);
      if (viaHotkeyRef.current) window.electronAPI.setOverlayState({ kind: 'error', label: t.errorCopy[ErrorType.AUDIO_RECORDING_FAILED].status });
    }
  }, [audioRecorder, setIsRecording, setError, onRecordingComplete, t]);

  // a tap of the trigger key in any app: start, or stop and transcribe (ignored while still transcribing)
  useEffect(() => window.electronAPI.onHotkeyToggle(() => {
    if (isRecording) stop();
    else if (!isProcessing) start(true);
  }), [isRecording, isProcessing, start, stop]);

  const chips = triggerKey !== 'off' ? [TRIGGER_LABEL[triggerKey]] : [];

  return (
    <div className="flex shrink-0 flex-col items-center gap-3 pt-2">
      <div className="relative grid h-[84px] w-[84px] place-items-center">
        {/* the voice ring */}
        {isRecording && (
          <>
            <span
              ref={ringRef}
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-ink/10 transition-transform duration-75"
              style={{ transform: 'scale(calc(1 + var(--level, 0) * 0.32))' }}
            />
            <span aria-hidden="true" className="absolute inset-0 rounded-full ring-2 ring-ink/15 animate-breathe" />
          </>
        )}
        {/* the working arc */}
        {isProcessing && (
          <svg aria-hidden="true" className="absolute -inset-1 animate-orbit text-ink/70" viewBox="0 0 92 92" fill="none">
            <circle cx="46" cy="46" r="43" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" />
            <path d="M46 3a43 43 0 0137.24 21.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}

        <button
          onClick={() => (isRecording ? stop() : start(false))}
          disabled={isProcessing}
          aria-label={isRecording ? t.stopRecording : t.startRecording}
          className={`relative grid h-[72px] w-[72px] place-items-center rounded-full transition-[transform,background-color,box-shadow] duration-500 ease-spring
            hover:-translate-y-0.5 active:scale-95 disabled:cursor-wait disabled:hover:translate-y-0 ${
            isRecording
              ? 'bg-ink text-paper shadow-[0_20px_40px_-16px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.18)]'
              : 'text-ink shadow-[0_22px_40px_-18px_rgba(0,0,0,0.55),0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_0_#fff,inset_0_-8px_16px_rgba(24,28,36,0.07)]'
          }`}
          style={isRecording ? undefined : { background: 'radial-gradient(circle at 34% 28%, #fff 0%, #f6f7f9 45%, #e3e6eb 100%)' }}
        >
          {isRecording ? (
            <span className="h-5 w-5 rounded-[6px] bg-paper" />
          ) : (
            <svg className={`h-7 w-7 transition-opacity ${isProcessing ? 'opacity-30' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex h-5 items-center gap-1.5 text-[11px] text-ink/45">
        {isProcessing ? null : (
          <>
            <span>{isRecording ? t.stopRecording : t.startRecording}</span>
            <span className="flex gap-0.5">
              {chips.map((k, i) => <kbd key={i} className="kbd">{k}</kbd>)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
