import React from 'react';
import type { AppError } from '../../shared/types';
import { ErrorType } from '../../shared/types';
import { useAppContext } from '../App';

export interface NoticeAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface ErrorDisplayProps {
  error: AppError;
  actions: NoticeAction[];
  onDismiss: () => void;
}

// A failure, said plainly in the window rather than as a pop-up: what happened, what to do, and the button
// that does it. The message OpenAI actually sent sits under "Details" for when the plain words aren't enough.
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, actions, onDismiss }) => {
  const { t, uiLanguage } = useAppContext();
  const copy = t.errorCopy[error.type] ?? t.errorCopy[ErrorType.UNKNOWN_ERROR];
  const money = error.type === ErrorType.INSUFFICIENT_QUOTA;

  return (
    <section role="alert" className="card relative shrink-0 p-4 !ring-alert/20 animate-rise">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-alert/10 text-alert">
          {money ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="13" rx="3" />
              <path d="M3 10h18M7 15h3" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M12 8v5M12 16.5v.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-snug text-ink">{copy.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/65">{copy.body}</p>
          {error.message && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-[11px] text-ink/40 hover:text-ink/60">
                {uiLanguage === 'zh' ? '詳細資訊' : 'Details'}
              </summary>
              <p className="mt-1 select-text break-words font-mono text-[11px] leading-relaxed text-ink/50">{error.message}</p>
            </details>
          )}
          {actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map(action => (
                <button key={action.label} onClick={action.onClick} className={`${action.primary ? 'pill-solid' : 'pill-paper'} !px-3.5 !py-1.5 !text-xs`}>
                  {action.label}
                  {action.primary && money && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 2h6v6M10 2L3 9" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onDismiss} aria-label={t.actions.dismiss} className="icon-btn -mr-1 -mt-1 h-7 w-7">
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M3 3l6 6M9 3L3 9" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default ErrorDisplay;
