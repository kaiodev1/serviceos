'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_EVENT, THEME_KEY } from '@/lib/theme';

function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}
function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const syncPreference = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      /* Respect system theme without storage. */
    }
    document.documentElement.dataset.theme =
      saved === 'light' || saved === 'dark' ? saved : media.matches ? 'dark' : 'light';
    callback();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) syncPreference();
  };
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', onStorage);
  media.addEventListener('change', syncPreference);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', onStorage);
    media.removeEventListener('change', syncPreference);
  };
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
  return (
    <button
      type="button"
      className="icon-button theme-toggle no-print"
      aria-label={label}
      title={label}
      onClick={() => {
        const theme = isDark() ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem(THEME_KEY, theme);
        } catch {
          /* Keep the choice for this page even without storage. */
        }
        window.dispatchEvent(new Event(THEME_EVENT));
      }}
    >
      <Sun className="theme-sun" size={18} aria-hidden="true" />
      <Moon className="theme-moon" size={18} aria-hidden="true" />
    </button>
  );
}
