import { Injectable, signal, computed } from '@angular/core';

export type AppTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'emx-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly currentTheme = signal<AppTheme>(this.getInitialTheme());
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    this.applyThemeToDom(this.currentTheme());
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    this.saveThemePreference(theme);
    this.applyThemeToDom(theme);
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  private getInitialTheme(): AppTheme {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'light';
    }

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }

      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback on restricted storage environments
    }

    return 'light';
  }

  private saveThemePreference(theme: AppTheme): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore write errors (e.g. private mode quota)
    }
  }

  private applyThemeToDom(theme: AppTheme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
      document.body?.classList.add('dark-theme');
    } else {
      root.classList.remove('dark');
      document.body?.classList.remove('dark-theme');
    }
  }
}
