import React, { useLayoutEffect, useRef, useState } from 'react';
import { useAppContext } from '../App';

export type View = 'transcribe' | 'history';

interface TitleBarProps {
  view: View;
  onViewChange: (view: View) => void;
  historyCount: number;
  onOpenSettings: () => void;
}

// The window's top edge, in the site's nav language: a smoky ink pill with a white knob that slides to the
// chosen tab. The whole strip drags the window; only the controls in it don't.
export const TitleBar: React.FC<TitleBarProps> = ({ view, onViewChange, historyCount, onOpenSettings }) => {
  const { t } = useAppContext();
  const tabs: { id: View; label: string; count?: number }[] = [
    { id: 'transcribe', label: t.nav.transcribe },
    { id: 'history', label: t.nav.history, count: historyCount },
  ];

  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [knob, setKnob] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = refs.current[view];
    if (el) setKnob({ left: el.offsetLeft, width: el.offsetWidth });
  }, [view, t, historyCount]);

  return (
    <header className="drag relative flex h-16 shrink-0 items-center justify-between px-4">
      {/* close and minimize, quiet until hovered */}
      <div className="no-drag group flex items-center gap-1.5">
        <button
          onClick={() => window.electronAPI.closeWindow()}
          aria-label={t.close}
          title={t.close}
          className="grid h-3 w-3 place-items-center rounded-full bg-ink/15 transition-colors hover:bg-alert"
        >
          <svg className="h-2 w-2 text-paper opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
            <path d="M2 2l4 4M6 2L2 6" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          aria-label={t.minimize}
          title={t.minimize}
          className="grid h-3 w-3 place-items-center rounded-full bg-ink/15 transition-colors hover:bg-ink/60"
        >
          <svg className="h-2 w-2 text-paper opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
            <path d="M2 4h4" />
          </svg>
        </button>
      </div>

      <nav
        aria-label="Views"
        className="no-drag absolute left-1/2 flex -translate-x-1/2 items-center rounded-full bg-ink/[0.82] p-1 font-nav shadow-pill ring-1 ring-white/10 backdrop-blur-xl"
      >
        {knob && (
          <span
            aria-hidden="true"
            className="absolute bottom-1 top-1 rounded-full bg-white/90 shadow-knob transition-[left,width] duration-500 ease-spring"
            style={{ left: knob.left, width: knob.width }}
          />
        )}
        {tabs.map(tab => (
          <button
            key={tab.id}
            ref={el => { refs.current[tab.id] = el; }}
            onClick={() => onViewChange(tab.id)}
            aria-current={view === tab.id ? 'page' : undefined}
            className={`relative z-10 flex h-8 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors duration-300 ${
              view === tab.id ? 'text-ink' : 'text-white/75 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`font-mono text-[10px] tabular-nums ${view === tab.id ? 'text-ink/45' : 'text-white/45'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <button onClick={onOpenSettings} aria-label={t.settings} title={t.settings} className="no-drag icon-btn h-9 w-9">
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>
    </header>
  );
};
