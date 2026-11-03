import React from 'react';
import { useAppContext } from '../App';
import { languageLabel } from '../../shared/languages';

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

// One line above the transcript saying what the app is doing: a dot, a word, and on the right the language
// it listens for (or the running clock while recording). A failure names itself here ("Out of credit"), with
// the full explanation in the notice below.
export const StatusIndicator: React.FC<{ language: string }> = ({ language }) => {
  const { isRecording, isProcessing, error, transcribedText, recordingDuration, t } = useAppContext();

  const state = error ? 'error' : isRecording ? 'recording' : isProcessing ? 'processing' : transcribedText ? 'done' : 'ready';
  const label = {
    error: error ? t.errorCopy[error.type]?.status ?? t.status.error : '',
    recording: t.status.recording,
    processing: t.status.processing,
    done: t.status.done,
    ready: t.status.ready,
  }[state];

  const dot = {
    error: 'bg-alert',
    recording: 'bg-alert',
    processing: 'bg-ink/70',
    done: 'bg-ink',
    ready: 'bg-ink/25',
  }[state];

  return (
    <div className="flex h-6 items-center justify-between px-1" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="relative grid h-2 w-2 place-items-center">
          {(state === 'recording' || state === 'processing') && (
            <span className={`absolute inset-0 rounded-full ${dot} animate-ping opacity-60`} />
          )}
          <span className={`relative h-2 w-2 rounded-full ${dot} transition-colors duration-300`} />
        </span>
        <span className={`eyebrow ${state === 'error' ? '!text-alert' : state === 'ready' ? '' : '!text-ink/70'}`}>{label}</span>
      </div>
      <span className="font-mono text-[11px] tabular-nums text-ink/45">
        {isRecording ? formatClock(recordingDuration) : `${languageLabel(language)} · gpt-transcribe`}
      </span>
    </div>
  );
};
