'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeId = 'night' | 'dusk' | 'forest' | 'ocean';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  /** gradient swatch — start color */
  from: string;
  /** gradient swatch — end color */
  to: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'forest', name: 'Forest', from: '#2E7D32', to: '#76C442' },
  { id: 'night',  name: 'Night',  from: '#003791', to: '#FF7722' },
  { id: 'dusk',   name: 'Dusk',   from: '#8B1A2E', to: '#F4A421' },
  { id: 'ocean',  name: 'Ocean',  from: '#0066B3', to: '#00B8D4' },
];

const STORAGE_KEY = 'pm_theme';

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('forest');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeState(stored);
      // data-theme was already applied by the inline script in <head>
    }
  }, []);

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
    document.documentElement.setAttribute('data-theme', id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
