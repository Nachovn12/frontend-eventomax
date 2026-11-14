import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, EventMessage } from '@azure/msal-browser';
import { BehaviorSubject, Subject } from 'rxjs';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authMock: any;
  let routerMock: any;
  let broadcastMock: any;
  let inProgressSubject: BehaviorSubject<InteractionStatus>;
  let msalSubject: Subject<EventMessage>;

  beforeEach(async () => {
    inProgressSubject = new BehaviorSubject<InteractionStatus>(InteractionStatus.Startup);
    msalSubject = new Subject<EventMessage>();

    broadcastMock = {
      inProgress$: inProgressSubject.asObservable(),
      msalSubject$: msalSubject.asObservable(),
    };

    authMock = {
      login: vi.fn().mockResolvedValue(undefined),
      loginError: signal<string | null>(null),
      isAuthenticated: vi.fn().mockReturnValue(false),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: MsalBroadcastService, useValue: broadcastMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the Dashboard showcase slide with high-resolution platform content', () => {
    const activeSlides = fixture.nativeElement.querySelectorAll('.b-slide.active');
    const allSlides = fixture.nativeElement.querySelectorAll('.b-slide');

    expect(allSlides.length).toBe(1);
    expect(activeSlides.length).toBe(1);
    expect(component.slides.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.b-slide.active .b-img').getAttribute('src')).toBe('/branding/eventomax/login/eventomax-login-produccion.jpg');
    expect(fixture.nativeElement.querySelector('.b-slide.active .eyebrow').textContent).toBe('PRODUCCIÓN');
    expect(fixture.nativeElement.querySelector('.b-slide.active .b-copy h2').textContent).toBe(component.slides[0].title);
    expect(fixture.nativeElement.querySelector('.b-slide.active .b-copy p').textContent).toBe(component.slides[0].description);
  });

  it('renders the corporate heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Acceso a EventoMax');
  });

  it('contains the Microsoft login button and no custom email/password fields', () => {
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.login-microsoft-button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Iniciar sesión con Microsoft');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('img.microsoft-mark')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.login-microsoft-button').length).toBe(1);

    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBe(0);

    const selects = fixture.nativeElement.querySelectorAll('select');
    expect(selects.length).toBe(0);
  });

  it('triggers existing login flow on click', () => {
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.login-microsoft-button');
    button.click();
    expect(authMock.login).toHaveBeenCalled();
  });

  it('disables action during loading to prevent double-submit', () => {
    inProgressSubject.next(InteractionStatus.None);
    component.onLogin();
    expect(component.isLoading()).toBe(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.login-microsoft-button');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('displays readable error message on MSAL failure', () => {
    authMock.loginError.set('No pudimos iniciar sesión.');
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();

    const errorNode = fixture.nativeElement.querySelector('.err');
    expect(errorNode).toBeTruthy();
    expect(errorNode.textContent).toContain('No pudimos iniciar sesión');
    expect(fixture.nativeElement.querySelector('.login-microsoft-button').disabled).toBe(false);
  });

  it('keeps the CTA busy during HandleRedirect and restores it at None without accounts', () => {
    inProgressSubject.next(InteractionStatus.HandleRedirect);
    expect(component.isLoading()).toBe(true);
    expect(authMock.isAuthenticated).not.toHaveBeenCalled();
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-microsoft-button').disabled).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('restores the normal CTA after a logout callback without accounts', () => {
    inProgressSubject.next(InteractionStatus.Logout);
    inProgressSubject.next(InteractionStatus.HandleRedirect);
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.login-microsoft-button');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Iniciar sesión con Microsoft');
    expect(component.isLoading()).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('enables retry when redirect initialization rejects before emitting events', async () => {
    inProgressSubject.next(InteractionStatus.None);
    authMock.login.mockRejectedValue(new Error('Initialization failed'));
    await component.onLogin();
    expect(component.isLoading()).toBe(false);
  });

  it('redirects to dashboard if already authenticated', () => {
    authMock.isAuthenticated.mockReturnValue(true);
    inProgressSubject.next(InteractionStatus.None);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('binds currentSlide to the dashboard preview presentation', () => {
    expect(component.currentSlide().image).toBe('/branding/eventomax/login/eventomax-login-produccion.jpg');
    expect(component.activeSlide()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.b-slide .b-img').length).toBe(1);
  });
});
