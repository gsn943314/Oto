import React, { useState, useEffect, useCallback } from 'react';
import type { AppSettings, TriggerKey } from '../../shared/types';
import { DEFAULT_SETTINGS, EXTERNAL_LINKS } from '../../shared/constants';
import { AUTO_LANGUAGE, DICTATION_LANGUAGES } from '../../shared/languages';
import { useAppContext } from '../App';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void> | void;
}

// A two-way switch in the nav's language: the chosen side is a raised white knob
function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const index = Math.max(0, options.findIndex(o => o.value === value));
  return (
    <div className="relative grid rounded-full bg-ink/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden="true"
        className="absolute bottom-1 top-1 rounded-full bg-paper shadow-knob ring-1 ring-ink/[0.06] transition-[left] duration-500 ease-spring"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, left: `calc(0.25rem + (100% - 0.5rem) / ${options.length} * ${index})` }}
      />
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`relative z-10 h-8 rounded-full text-[13px] font-medium transition-colors ${o.value === value ? 'text-ink' : 'text-ink/50 hover:text-ink/80'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Row: React.FC<{ label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode }> = ({ label, hint, error, children }) => (
  <div className="space-y-2">
    <div className="text-[13px] font-medium text-ink/80">{label}</div>
    {children}
    {error ? <p className="text-xs text-alert">{error}</p> : hint ? <p className="text-xs text-ink/45">{hint}</p> : null}
  </div>
);

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onSave }) => {
  const { t, uiLanguage } = useAppContext();
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [original, setOriginal] = useState<AppSettings | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [trusted, setTrusted] = useState<boolean | null>(null);
  const [granting, setGranting] = useState(false);

  // whether macOS lets Oto watch the trigger key and paste (it can change while the sheet is open)
  useEffect(() => {
    if (!isOpen) return;
    window.electronAPI.getAccessibilityStatus().then(setTrusted).catch(() => setTrusted(null));
    return window.electronAPI.onAccessibilityChange(setTrusted);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setShowApiKey(false);
    window.electronAPI.loadSettings()
      .then(loaded => { setSettings(loaded); setOriginal(loaded); })
      .catch(err => console.error('Failed to load settings:', err));
    // only when the sheet opens; the language preview below must not reload it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[key as string]; delete next.general; return next; });
  }, []);

  const validate = (s: AppSettings) => {
    const e: Record<string, string> = {};
    if (s.apiKey && !s.apiKey.startsWith('sk-')) e.apiKey = t.errors.apiKeyInvalid;
    else if (s.apiKey && s.apiKey.length < 20) e.apiKey = t.errors.apiKeyTooShort;
    if (s.historyLimit < 1 || s.historyLimit > 100) e.historyLimit = t.errors.historyLimitRange;
    return e;
  };

  const handleSave = async () => {
    const e = validate(settings);
    if (Object.keys(e).length) { setErrors(e); return; }
    setIsSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch {
      setErrors({ general: t.errors.saveFailed });
    } finally {
      setIsSaving(false);
    }
  };

  // put back what was previewed (language, opacity) and leave
  const handleCancel = () => {
    if (original) {
      window.electronAPI.setWindowOpacity?.(original.windowOpacity);
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] animate-fade" onClick={handleCancel} />

      <div role="dialog" aria-modal="true" aria-label={t.settings}
        className="relative mx-2 mb-2 mt-14 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-grout shadow-[0_-20px_60px_-24px_rgba(0,0,0,0.5)] ring-1 ring-white/60 animate-sheet">
        <header className="flex h-14 shrink-0 items-center justify-between pl-6 pr-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{t.settings}</h2>
          <button onClick={handleCancel} className="icon-btn" aria-label={t.cancel}>
            <svg className="h-4 w-4" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
              <path d="M3 3l6 6M9 3L3 9" />
            </svg>
          </button>
        </header>

        <div className="thin-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {errors.general && <p className="rounded-2xl bg-alert/10 px-4 py-2.5 text-sm text-alert">{errors.general}</p>}

          <section className="space-y-2">
            <h3 className="eyebrow px-2">{t.anywhere.section}</h3>
            <div className="card space-y-4 p-4">
              <Row label={t.anywhere.trigger} hint={settings.triggerKey === 'fn' ? t.anywhere.fnHint : t.anywhere.triggerHint}>
                <Segmented<TriggerKey>
                  value={settings.triggerKey ?? 'control'}
                  options={[
                    { value: 'control', label: '⌃ Control' },
                    { value: 'fn', label: 'fn' },
                    { value: 'rightOption', label: t.anywhere.rightOption },
                    { value: 'off', label: t.anywhere.off },
                  ]}
                  onChange={v => update('triggerKey', v)}
                />
              </Row>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block text-[13px] font-medium text-ink/80">{t.anywhere.autoPaste}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink/45">{t.anywhere.autoPasteHint}</span>
                </span>
                <input type="checkbox" className="peer sr-only" checked={settings.autoPaste ?? true} onChange={e => update('autoPaste', e.target.checked)} />
                <span aria-hidden="true" className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-ink/15 transition-colors duration-300 peer-checked:bg-ink
                  after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow-knob after:transition-transform after:duration-500 after:ease-spring peer-checked:after:translate-x-4" />
              </label>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block text-[13px] font-medium text-ink/80">{t.anywhere.pointerBadge}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink/45">{t.anywhere.pointerBadgeHint}</span>
                </span>
                <input type="checkbox" className="peer sr-only" checked={settings.pointerBadge ?? true} onChange={e => update('pointerBadge', e.target.checked)} />
                <span aria-hidden="true" className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-ink/15 transition-colors duration-300 peer-checked:bg-ink
                  after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow-knob after:transition-transform after:duration-500 after:ease-spring peer-checked:after:translate-x-4" />
              </label>
              <div className={`flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 ${trusted === false ? 'bg-alert/[0.07]' : 'bg-ink/[0.04]'}`}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink/80">
                    <span className={`h-1.5 w-1.5 rounded-full ${trusted ? 'bg-ink' : trusted === false ? 'bg-alert' : 'bg-ink/25'}`} />
                    {t.anywhere.permission}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink/50">
                    {trusted ? t.anywhere.permissionGranted : granting ? t.anywhere.granting : t.anywhere.permissionMissing}
                  </span>
                </span>
                {trusted === false && !granting && (
                  <button type="button" onClick={() => { setGranting(true); window.electronAPI.requestAccessibility(); }} className="pill-solid shrink-0 !px-3 !py-1.5 !text-xs">
                    {t.anywhere.grant}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="eyebrow px-2">{t.sections.account}</h3>
            <div className="card space-y-4 p-4">
              <Row
                label={t.openAIApiKey}
                error={errors.apiKey}
                hint={
                  <button type="button" onClick={() => window.electronAPI.openExternal(EXTERNAL_LINKS.OPENAI_API_KEYS)} className="underline decoration-ink/20 underline-offset-2 hover:text-ink">
                    {t.getApiKey} ↗
                  </button>
                }
              >
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={e => update('apiKey', e.target.value.trim())}
                    placeholder={t.apiKeyPlaceholder}
                    spellCheck={false}
                    className="field pr-11 font-mono text-[13px]"
                  />
                  <button type="button" onClick={() => setShowApiKey(v => !v)} className="icon-btn absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2" aria-label={showApiKey ? 'Hide' : 'Show'}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="2.75" />
                      {showApiKey && <path d="M4 20L20 4" />}
                    </svg>
                  </button>
                </div>
              </Row>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.electronAPI.openExternal(EXTERNAL_LINKS.OPENAI_BILLING)} className="pill-paper flex-1 !py-1.5 !text-xs">
                  {uiLanguage === 'zh' ? '餘額與儲值' : 'Balance'} ↗
                </button>
                <button type="button" onClick={() => window.electronAPI.openExternal(EXTERNAL_LINKS.OPENAI_USAGE)} className="pill-paper flex-1 !py-1.5 !text-xs">
                  {uiLanguage === 'zh' ? '用量' : 'Usage'} ↗
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="eyebrow px-2">{t.sections.language}</h3>
            <div className="card space-y-4 p-4">
              <Row
                label={t.dictation.label}
                hint={(settings.dictationLanguage ?? AUTO_LANGUAGE) === AUTO_LANGUAGE ? t.dictation.autoHint : t.dictation.pinnedHint}
              >
                <div className="relative">
                  <select
                    value={settings.dictationLanguage ?? AUTO_LANGUAGE}
                    onChange={e => update('dictationLanguage', e.target.value)}
                    className="field cursor-pointer appearance-none pr-10"
                  >
                    <option value={AUTO_LANGUAGE}>{t.dictation.auto}</option>
                    <optgroup label="—">
                      {DICTATION_LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>
                          {l.native === l.name ? l.name : `${l.native} — ${l.name}`}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <svg className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4.5l3 3 3-3" />
                  </svg>
                </div>
              </Row>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="eyebrow px-2">{t.sections.window}</h3>
            <div className="card space-y-4 p-4">
              <Row label={t.windowOpacity}>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={50} max={100} step={5}
                    value={Math.round(settings.windowOpacity * 100)}
                    onChange={e => {
                      const opacity = Number(e.target.value) / 100;
                      update('windowOpacity', opacity);
                      window.electronAPI.setWindowOpacity?.(opacity);
                    }}
                    className="h-1 flex-1 cursor-pointer accent-[rgb(24,28,36)]"
                  />
                  <span className="w-10 text-right font-mono text-xs tabular-nums text-ink/60">{Math.round(settings.windowOpacity * 100)}%</span>
                </div>
              </Row>
              <Row label={t.historyLimit} error={errors.historyLimit}>
                <input
                  type="number" min={1} max={100}
                  value={settings.historyLimit}
                  onChange={e => update('historyLimit', parseInt(e.target.value, 10) || 0)}
                  className="field w-28 font-mono tabular-nums"
                />
              </Row>
            </div>
          </section>


        </div>

        <footer className="flex shrink-0 gap-2 border-t border-ink/[0.06] bg-grout/80 p-3 backdrop-blur-xl">
          <button onClick={handleCancel} disabled={isSaving} className="pill-paper flex-1">{t.cancel}</button>
          <button onClick={handleSave} disabled={isSaving} className="pill-solid flex-1">{isSaving ? t.saving : t.save}</button>
        </footer>
      </div>
    </div>
  );
};
