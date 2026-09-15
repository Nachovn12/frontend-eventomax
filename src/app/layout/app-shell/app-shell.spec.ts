import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppShell } from './app-shell';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

describe('AppShell', () => {
  let fixture: ComponentFixture<AppShell>;
  const roles = signal<AppRole[]>([]);
  const logout = vi.fn();
  beforeEach(async () => {
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
  it('renders the brand and the current account without exposing tokens', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.brand-text')?.textContent).toBe('EventoMax');
    expect(element.querySelector('.user-name-role')?.textContent).toBe('Persona de Prueba · Sin rol asignado');
  });
  it.each([
    [AppRole.Admin, ['/dashboard', '/productions', '/catalog', '/reports']],
    [AppRole.Producer, ['/dashboard', '/productions', '/catalog']],
    [AppRole.Organizer, ['/dashboard', '/productions']],
    [AppRole.Auditor, ['/dashboard', '/audit']],
  ])('keeps the existing navigation permissions for %s', (role, expected) => {
    roles.set([role]);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-link'),
    ).map((link) => link.getAttribute('href'));
    expect(links).toEqual(expected);
  });
  it('combines explicit roles without granting Auditor to Admin', () => {
    roles.set([AppRole.Admin, AppRole.Auditor]);
    fixture.detectChanges();
    expect(fixture.componentInstance.displayRole()).toBe('Administrador, Auditor');
    expect(fixture.nativeElement.querySelector('a[href="/audit"]')).not.toBeNull();
  });
  it('closes mobile navigation on Escape and returns focus to its toggle', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.mobile-toggle');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const sidebar: HTMLElement = fixture.nativeElement.querySelector('.shell-sidebar');
    sidebar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
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
    fixture.nativeElement.querySelector('.btn-logout').click();
    expect(logout).toHaveBeenCalledOnce();
  });
});
