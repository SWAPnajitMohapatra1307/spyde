// client/src/stores/themeStore.ts
import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const THEME_STORAGE_KEY = 'spyde_theme';

const applyThemeToDOM = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',

  setTheme: (theme: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyThemeToDOM(next);
    set({ theme: next });
  },

  initTheme: () => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const initialTheme: ThemeMode = stored === 'light' || stored === 'dark' ? stored : 'dark';
    applyThemeToDOM(initialTheme);
    set({ theme: initialTheme });
  },
}));
