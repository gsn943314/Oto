import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../App';

interface TextDisplayProps {
  onCopy: (text: string) => void;
}

// The transcript: a white sheet that fills the space between the status line and the record button, with
// its length and the two things you do with it (clear, copy) along the bottom edge.
export const TextDisplay: React.FC<TextDisplayProps> = ({ onCopy }) => {
  const { transcribedText, setTranscribedText, isProcessing, error, t } = useAppContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [transcribedText, isProcessing]);

  const count = [...transcribedText.replace(/\s/g, '')].length;

  return (
    <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-5">
        {transcribedText ? (
          <p className="select-text whitespace-pre-wrap break-words text-[15px] leading-[1.75] text-ink">{transcribedText}</p>
        ) : !isProcessing && !error ? (
          <div className="flex h-full flex-col justify-end pb-2">
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink/80">{t.emptyTitle}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/45">{t.emptyHint}</p>
          </div>
        ) : null}

        {/* while the words are on their way: three dots where they will appear */}
        {isProcessing && (
          <div className={`flex items-center gap-2 text-[13px] text-ink/45 ${transcribedText ? 'mt-3' : 'h-full items-end pb-2'}`}>
            <span className="flex gap-1">
              {[0, 160, 320].map(delay => (
                <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            {t.holdOn}
          </div>
        )}
      </div>

      <footer className="flex h-12 shrink-0 items-center justify-between border-t border-ink/[0.06] pl-5 pr-2">
        <span className="font-mono text-[11px] tabular-nums text-ink/40">
          {count} {t.characters}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTranscribedText('')}
            disabled={!transcribedText}
            className="icon-btn"
            aria-label={t.clear}
            title={t.clear}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
            </svg>
          </button>
          <button
            onClick={() => onCopy(transcribedText)}
            disabled={!transcribedText}
            className="pill-solid !py-1.5 !pl-3 !pr-3.5 !text-xs"
            title={t.copy}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="8" width="12" height="12" rx="3" />
              <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
            </svg>
            {t.copy}
          </button>
        </div>
      </footer>
    </section>
  );
};
