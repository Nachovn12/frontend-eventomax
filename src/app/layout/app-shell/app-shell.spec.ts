import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppShell } from './app-shell';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { ActiveProductionsStore } from '../../core/state/active-productions.store';

describe('AppShell', () => {
  let fixture: ComponentFixture<AppShell>;
  const roles = signal<AppRole[]>([]);
  const logout = vi.fn();
  const mediaListeners = new Map<string, (event: { matches: boolean }) => void>();
  beforeEach(async () => {
    localStorage.removeItem('emx-sidebar-collapsed');
    mediaListeners.clear();
    vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        mediaListeners.set(media, listener),
      removeEventListener: vi.fn(),
    })));
    roles.set([]);
    logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { logout, getAccount: () => ({ name: 'Persona de Prueba' }) },
        },
        { provide: AuthorizationService, useValue: { roles } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
  });
  afterEach(() => {
    localStorage.removeItem('emx-sidebar-collapsed');
    vi.unstubAllGlobals();
  });

  it('preserves the desktop preference while keeping mobile navigation labels visible', () => {
    roles.set([AppRole.Admin]);
    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();
    expect(localStorage.getItem('emx-sidebar-collapsed')).toBe('true');
    mediaListeners.get('(max-width: 767px)')!({ matches: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.shell-sidebar.is-collapsed')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/productions"]').textContent).toContain('Producciones');
    expect(fixture.nativeElement.querySelector('.brand-text')).not.toBeNull();
    mediaListeners.get('(max-width: 767px)')!({ matches: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.shell-sidebar.is-collapsed')).not.toBeNull();
  });

  it('restores the saved sidebar preference synchronously on mount without native title duplication', () => {
    fixture.componentInstance.toggleSidebar();
    fixture.destroy();
    fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(true);
    expect(fixture.nativeElement.querySelector('.desktop-toggle').getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.nav-link').getAttribute('aria-label')).toBe('Dashboard');
    expect(fixture.nativeElement.querySelector('.nav-link').getAttribute('title')).toBeNull();
  });

  it('respects a preference chosen after startup when returning to tablet width', () => {
    fixture.componentInstance.toggleSidebar();
    fixture.componentInstance.toggleSidebar();
    mediaListeners.get('(min-width: 768px) and (max-width: 1199px)')!({ matches: true });
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(false);
  });

  it('closes the account disclosure on Escape and restores focus', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.account-trigger');
    expect(trigger.getAttribute('aria-label')).toBe('Cuenta de Persona de Prueba');
    trigger.click();
    fixture.detectChanges();
    const action: HTMLButtonElement = fixture.nativeElement.querySelector('.account-menu-item');
    action.focus();
    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the account disclosure on outside click and when focus leaves', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.account-trigger');
    trigger.click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('main').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeNull();
    trigger.click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.account-menu-item').focus();
    fixture.nativeElement.querySelector('.skip-link').focus();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account-menu')).toBeNull();
  });
  it('renders the brand and the current account without exposing tokens', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.brand-text')?.textContent).toBe('EventoMax');
    expect(element.querySelector('.user-name-role')?.textContent?.trim()).toBe('Persona De Prueba');
  });
  it.each([
    [AppRole.Admin, ['/dashboard', '/productions', '/catalog', '/reports', '/audit', '/organizers']],
    [AppRole.Productor, ['/dashboard', '/productions', '/catalog']],
    [AppRole.Organizador, ['/dashboard', '/productions']],
    [AppRole.Auditor, ['/dashboard', '/audit']],
  ])('shows the role-based navigation for %s (EP2 modules)', (role, expected) => {
    roles.set([role]);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-link'),
    ).map((link) => link.getAttribute('href'));
    expect(links).toEqual(expected);
  });
  it('combines explicit roles in the display name', () => {
    roles.set([AppRole.Admin, AppRole.Auditor]);
    fixture.detectChanges();
    expect(fixture.componentInstance.displayRole()).toBe('Administrador, Auditor');
    expect(fixture.nativeElement.querySelector('a[href="/audit"]')).not.toBeNull();
  });
  it('closes mobile navigation on Escape and returns focus to its toggle', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.mobile-toggle-btn');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const sidebar: HTMLElement = fixture.nativeElement.querySelector('.shell-sidebar');
    sidebar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('exposes properly encoded accessible labels and titles for mobile and desktop menu toggles', () => {
    const openBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.mobile-toggle-btn');
    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.mobile-toggle');
    const desktopToggle: HTMLButtonElement = fixture.nativeElement.querySelector('.desktop-toggle');

    expect(openBtn.getAttribute('aria-label')).toBe('Abrir menú');
    expect(closeBtn.getAttribute('aria-label')).toBe('Cerrar menú');
    expect(desktopToggle.getAttribute('aria-label')).toBe('Colapsar menú');
    expect(desktopToggle.getAttribute('title')).toBe('Colapsar menú');

    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();

    expect(desktopToggle.getAttribute('aria-label')).toBe('Expandir menú');
    expect(desktopToggle.getAttribute('title')).toBe('Expandir menú');
  });
  it('has a keyboard skip link and focusable main landmark', () => {
    expect(fixture.nativeElement.querySelector('.skip-link').getAttribute('href')).toBe(
      '#main-content',
    );
    expect(fixture.nativeElement.querySelector('main#main-content').getAttribute('tabindex')).toBe(
      '-1',
    );
  });
  it('skips to main content without following the base URL to /login', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.skip-link');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('main'));
  });
  it('delegates logout to the existing AuthService', () => {
    fixture.componentInstance.accountMenuOpen.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.account-menu-item').click();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('toggles the sidebar with Ctrl+B / Cmd+B keyboard shortcut and renders semantic ul/li lists', () => {
    roles.set([AppRole.Admin]);
    fixture.detectChanges();
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(false);

    const lists = fixture.nativeElement.querySelectorAll('nav[aria-label="Navegación principal"] ul[role="list"]');
    expect(lists.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('nav[aria-label="Navegación principal"] li.nav-list-item').length).toBe(6);

    const ctrlB = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(ctrlB);
    fixture.detectChanges();
    expect(ctrlB.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(true);

    const cmdB = new KeyboardEvent('keydown', { key: 'B', metaKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(cmdB);
    fixture.detectChanges();
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(false);
  });

  it('responds immediately on pointerdown without double-firing on click and clears is-animating on transitionend', () => {
    fixture.componentInstance.sidebarReady.set(true);
    fixture.detectChanges();
    const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.desktop-toggle');

    toggleBtn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(true);
    expect(fixture.componentInstance.sidebarAnimating()).toBe(true);

    toggleBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sidebarCollapsed()).toBe(true);

    const sidebar: HTMLElement = fixture.nativeElement.querySelector('.shell-sidebar');
    const transitionEnd = new Event('transitionend') as TransitionEvent;
    Object.defineProperty(transitionEnd, 'propertyName', { value: 'width' });
    sidebar.dispatchEvent(transitionEnd);
    fixture.detectChanges();
    expect(fixture.componentInstance.sidebarAnimating()).toBe(false);
  });

  it('displays dynamic active count badge when active productions exist and hides badge when count is zero', () => {
    roles.set([AppRole.Admin]);
    const store = TestBed.inject(ActiveProductionsStore);

    // Set 4 active productions
    store.setActiveCount(4);
    fixture.detectChanges();

    const prodLink = fixture.nativeElement.querySelector('a[href="/productions"]');
    const badge = prodLink?.querySelector('.nav-count-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('4');

    // Set 0 active productions (Apple silent UI rule)
    store.setActiveCount(0);
    fixture.detectChanges();

    const emptyBadge = prodLink?.querySelector('.nav-count-badge');
    expect(emptyBadge).toBeNull();
  });

  it('shows /organizers navigation link exclusively for Admin and hides it for Productor, Organizador and Auditor', () => {
    roles.set([AppRole.Admin]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/organizers"]')).not.toBeNull();

    for (const nonAdminRole of [AppRole.Productor, AppRole.Organizador, AppRole.Auditor]) {
      roles.set([nonAdminRole]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('a[href="/organizers"]')).toBeNull();
    }
  });
});
