import { TestBed } from '@angular/core/testing';
import { ThemeService, THEME_STORAGE_KEY } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-theme');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-theme');
  });

  it('initializes with light theme by default if no stored preference', () => {
    expect(service.currentTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles theme between light and dark', () => {
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(true);

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('sets explicit theme and persists to localStorage', () => {
    service.setTheme('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
