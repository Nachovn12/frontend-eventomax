import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Forbidden } from './forbidden';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthorizationService } from '../../../core/auth/authorization.service';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';

describe('Forbidden Component', () => {
  let component: Forbidden;
  let fixture: ComponentFixture<Forbidden>;
  let authMock: any;
  let authzMock: any;
  let rolesSignal: any;

  beforeEach(async () => {
    rolesSignal = signal<string[]>([]);
    authMock = {
      getAccount: vi.fn(),
      logout: vi.fn()
    };
    authzMock = {
      roles: rolesSignal,
      refreshAuthorization: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [Forbidden],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: AuthorizationService, useValue: authzMock }
      ]
    }).compileComponents();
  });

  it('renders correctly and shows "Acceso no autorizado"', () => {
    authMock.getAccount.mockReturnValue(null);
    fixture = TestBed.createComponent(Forbidden);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('.fb-title')).nativeElement;
    expect(title.textContent).toContain('Acceso no autorizado');
  });

  it('shows 403 context accessibly', () => {
    authMock.getAccount.mockReturnValue(null);
    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();

    const eyebrow = fixture.debugElement.query(By.css('.fb-eyebrow')).nativeElement;
    expect(eyebrow.textContent).toContain('403');

    const iconContainer = fixture.debugElement.query(By.css('.fb-icon')).nativeElement;
    expect(iconContainer.getAttribute('aria-hidden')).toBe('true');
  });

  it('navigates to /dashboard via primary button', () => {
    authMock.getAccount.mockReturnValue(null);
    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('a[routerLink="/dashboard"]'));
    expect(link).toBeTruthy();
    expect(link.nativeElement.textContent).toContain('Volver al dashboard');
  });

  it('calls AuthService.logout when logout button is clicked', () => {
    authMock.getAccount.mockReturnValue(null);
    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();

    const logoutBtn = fixture.debugElement.query(By.css('.fb-btn-secondary')).nativeElement;
    logoutBtn.click();

    expect(authMock.logout).toHaveBeenCalled();
  });

  it('calls refreshAuthorization exactly once on init if account exists and roles are empty', async () => {
    authMock.getAccount.mockReturnValue({ name: 'Test User' });
    rolesSignal.set([]);

    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();

    expect(authzMock.refreshAuthorization).toHaveBeenCalledTimes(1);

    fixture.detectChanges();
    const roleText = fixture.debugElement.query(By.css('.fb-user-role')).nativeElement;
    expect(roleText.textContent).toContain('Verificando permisos...');

    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows real user name and roles from MSAL when available', async () => {
    authMock.getAccount.mockReturnValue({ name: 'Ignacio Valeria' });
    rolesSignal.set([]);
    authzMock.refreshAuthorization.mockImplementation(() => {
      rolesSignal.set(['Productor']);
      return Promise.resolve();
    });

    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const userName = fixture.debugElement.query(By.css('.fb-user-name')).nativeElement;
    const userRole = fixture.debugElement.query(By.css('.fb-user-role')).nativeElement;

    expect(userName.textContent).toContain('Ignacio Valeria');
    expect(userRole.textContent).toContain('Productor');
  });

  it('shows Admin role correctly', async () => {
    authMock.getAccount.mockReturnValue({ name: 'Admin User' });
    rolesSignal.set(['Admin']);

    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const userRole = fixture.debugElement.query(By.css('.fb-user-role')).nativeElement;
    expect(userRole.textContent).toContain('Admin');
    expect(authzMock.refreshAuthorization).not.toHaveBeenCalled();
  });

  it('shows "Rol no disponible" and fails closed if refresh throws an error', async () => {
    authMock.getAccount.mockReturnValue({ username: 'ignacio@test.com' });
    rolesSignal.set([]);
    authzMock.refreshAuthorization.mockRejectedValue(new Error('Network error'));

    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const userRole = fixture.debugElement.query(By.css('.fb-user-role')).nativeElement;
    expect(userRole.textContent).toContain('Rol no disponible');
  });

  it('hides session info when user is totally missing', () => {
    authMock.getAccount.mockReturnValue(null);
    rolesSignal.set([]);

    fixture = TestBed.createComponent(Forbidden);
    fixture.detectChanges();

    const sessionInfo = fixture.debugElement.query(By.css('.fb-session-info'));
    expect(sessionInfo).toBeNull();
  });
});
