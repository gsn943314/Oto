import React, { useEffect, useState } from 'react';
import type { OverlayState } from '../../shared/types';
import { getTranslations } from '../../shared/i18n';

// each bar answers the voice a little differently, so the row reads as a waveform rather than one block
const SHAPE = [0.45, 0.7, 0.9, 1, 0.85, 0.65, 0.4];
const t = getTranslations('en'); // the interface is English for now

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function useOverlayState(): OverlayState {
  const [state, setState] = useState<OverlayState>({ kind: 'hidden' });
  useEffect(() => {
    document.documentElement.classList.add('overlay');
    return window.electronAPI.onOverlayState(setState);
  }, []);
  return state;
}

const Bars: React.FC<{ level: number; count?: number; max?: number; className?: string }> = ({ level, count = 7, max = 24, className = 'bg-ink' }) => (
  <span className="flex items-center gap-[3px]" style={{ height: max }} aria-hidden="true">
    {SHAPE.slice(0, count).map((k, i) => (
      <span
        key={i}
        className={`w-[3px] rounded-full transition-[height] duration-100 ease-out ${className}`}
        style={{ height: `${Math.max(4, Math.min(max, 4 + level * (max + 2) * k))}px` }}
      />
    ))}
  </span>
);

const LiveDot: React.FC = () => (
  <span className="relative grid h-3 w-3 place-items-center">
    <span className="absolute inset-0 animate-ping rounded-full bg-alert/60" />
    <span className="relative h-2.5 w-2.5 rounded-full bg-alert" />
  </span>
);

const Check: React.FC<{ size?: string }> = ({ size = 'h-6 w-6' }) => (
  <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-ink text-paper`}>
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  </span>
);

// The pill at the bottom of the screen while dictating from another app: a bright paper pill (it has to stand
// out over any app), holding a live waveform, then "Thinking…", then where the words went.
export const Overlay: React.FC = () => {
  const state = useOverlayState();
  if (state.kind === 'hidden') return null;

  let body: React.ReactNode;
  switch (state.kind) {
    case 'recording':
      body = (
        <>
          <LiveDot />
          <Bars level={state.level} />
          <span className="text-[14px] font-medium text-ink">Listening</span>
          <span className="font-mono text-[12px] tabular-nums text-ink/45">{clock(state.seconds)}</span>
        </>
      );
      break;
    case 'thinking':
      body = (
        <>
          <Spinner className="h-5 w-5" />
          <span className="text-[14px] font-medium text-ink">{t.overlay.thinking}</span>
        </>
      );
      break;
    case 'pasted':
      body = (
        <>
          <Check />
          <span className="max-w-[220px] truncate text-[14px] font-medium text-ink">
            {state.app ? t.overlay.pastedInto.replace('{app}', state.app) : t.overlay.pasted}
          </span>
        </>
      );
      break;
    case 'copied':
      body = (
        <>
          <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="8" width="12" height="12" rx="3" />
            <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
          </svg>
          <span className="text-[14px] font-medium text-ink">{t.overlay.copied}</span>
          <span className="flex gap-0.5"><kbd className="kbd">⌘</kbd><kbd className="kbd">V</kbd></span>
          <span className="-ml-1 text-[14px] font-medium text-ink">{t.overlay.copiedAfter}</span>
        </>
      );
      break;
    case 'error':
      body = (
        <>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-alert text-[13px] font-bold text-paper">!</span>
          <span className="text-[14px] font-medium text-alert">{state.label}</span>
        </>
      );
      break;
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div
        key={state.kind}
        className="flex h-12 items-center gap-3 rounded-full bg-paper px-5 font-nav ring-1 ring-ink/10 animate-pop
          shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45),0_4px_12px_-4px_rgba(0,0,0,0.18),inset_0_1px_0_#fff]"
      >
        {body}
      </div>
    </div>
  );
};

const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={`animate-orbit text-ink ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
    <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// The small badge that rides beside the pointer: a white bubble with the same state in miniature
export const CursorBadge: React.FC = () => {
  const state = useOverlayState();
  if (state.kind === 'hidden') return null;

  let inner: React.ReactNode;
  switch (state.kind) {
    case 'recording':
      inner = (
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-alert" />
          <Bars level={state.level} count={3} max={14} />
        </span>
      );
      break;
    case 'thinking':
      inner = <Spinner className="h-[18px] w-[18px]" />;
      break;
    case 'pasted':
    case 'copied':
      inner = <Check size="h-[22px] w-[22px]" />;
      break;
    case 'error':
      inner = <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-alert text-[12px] font-bold text-paper">!</span>;
      break;
  }

  return (
    <div className="flex h-screen items-start justify-start p-2">
      <div
        key={state.kind === 'recording' ? 'rec' : state.kind}
        className={`grid h-9 place-items-center rounded-full bg-paper ring-1 ring-ink/10 animate-pop shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_#fff] ${
          state.kind === 'recording' ? 'px-2.5' : 'w-9'
        }`}
      >
        {inner}
      </div>
    </div>
  );
};
