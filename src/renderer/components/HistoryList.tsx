import React, { useEffect, useMemo, useState } from 'react';
import type { TranscriptionHistory } from '../../shared/types';
import { useAppContext } from '../App';

interface HistoryListProps {
  history: TranscriptionHistory[];
  onSelectItem: (item: TranscriptionHistory) => void;
  onCopyItem: (item: TranscriptionHistory) => void;
  onClearHistory: () => void;
}

// Past transcripts grouped by day, newest first: the time and length in monospace, the words under them.
// Clicking one puts it back in the transcript; the copy button on its corner copies it without leaving.
export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelectItem, onCopyItem, onClearHistory }) => {
  const { t, uiLanguage } = useAppContext();
  const locale = uiLanguage === 'zh' ? 'zh-TW' : 'en-US';
  const [confirming, setConfirming] = useState(false);

  // "clear" asks once more before it erases everything
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  const days = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups: { label: string; items: TranscriptionHistory[] }[] = [];
    for (const item of history) {
      const d = new Date(item.timestamp).toDateString();
      const label = d === today ? (uiLanguage === 'zh' ? '今天' : 'Today')
        : d === yesterday ? (uiLanguage === 'zh' ? '昨天' : 'Yesterday')
        : new Date(item.timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric', weekday: 'short' });
      const last = groups[groups.length - 1];
      if (last?.label === label) last.items.push(item);
      else groups.push({ label, items: [item] });
    }
    return groups;
  }, [history, uiLanguage, locale]);

  const time = (ts: number) => new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const length = (s: number) => (s < 60 ? `${Math.max(1, Math.round(s))}s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

  if (history.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-paper text-ink/35 shadow-soft ring-1 ring-ink/[0.06]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        </span>
        <p className="mt-4 text-sm text-ink/50">{t.noHistory}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between px-1">
        <span className="eyebrow">{t.history} · <span className="font-mono tracking-normal">{history.length}</span></span>
        <button
          onClick={() => (confirming ? (onClearHistory(), setConfirming(false)) : setConfirming(true))}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            confirming ? 'bg-alert text-paper' : 'text-ink/45 hover:bg-ink/[0.06] hover:text-ink'
          }`}
        >
          {confirming ? t.clearHistoryConfirm : t.clearHistory}
        </button>
      </div>

      <div className="thin-scroll -mx-4 min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-1">
        {days.map(day => (
          <section key={day.label} className="mb-4">
            <h3 className="mb-2 px-1 font-mono text-[11px] text-ink/40">{day.label}</h3>
            <ul className="space-y-2">
              {day.items.map((item, i) => (
                <li key={item.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
                  <div className="group relative">
                    <button
                      onClick={() => onSelectItem(item)}
                      title={t.useThis}
                      className="block w-full rounded-[18px] bg-paper p-3.5 pr-11 text-left ring-1 ring-ink/[0.06] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.5)]
                        transition-[transform,box-shadow] duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-18px_rgba(0,0,0,0.55)]"
                    >
                      <span className="flex items-center gap-2 font-mono text-[10.5px] tabular-nums text-ink/40">
                        {time(item.timestamp)}
                        <span className="h-0.5 w-0.5 rounded-full bg-ink/30" />
                        {length(item.duration)}
                        <span className="h-0.5 w-0.5 rounded-full bg-ink/30" />
                        {item.language && item.language !== 'auto' ? item.language.toUpperCase() : '—'}
                      </span>
                      <span className="mt-1.5 line-clamp-3 block text-[13px] leading-relaxed text-ink/85">{item.text}</span>
                    </button>
                    <button
                      onClick={() => onCopyItem(item)}
                      aria-label={t.copy}
                      title={t.copy}
                      className="icon-btn absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="8" y="8" width="12" height="12" rx="3" />
                        <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};
