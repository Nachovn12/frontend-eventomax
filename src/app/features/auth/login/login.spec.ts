import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, EventMessage, EventType } from '@azure/msal-browser';
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
      login: vi.fn(),
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

  it('renders the corporate heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Acceso a EventoMax');
  });

  it('contains the Microsoft login button and no custom email/password fields', () => {
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.btn-ms');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Iniciar sesión con Microsoft');

    const inputs = fixture.nativeElement.querySelectorAll('input');
    expect(inputs.length).toBe(0);

    const selects = fixture.nativeElement.querySelectorAll('select');
    expect(selects.length).toBe(0);
  });

  it('triggers existing login flow on click', () => {
    inProgressSubject.next(InteractionStatus.None);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.btn-ms');
    button.click();
    expect(authMock.login).toHaveBeenCalled();
  });

  it('disables action during loading to prevent double-submit', () => {
    expect(component.isLoading()).toBe(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.btn-ms');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('displays readable error message on MSAL failure', () => {
    msalSubject.next({ error: new Error('Login failed') } as EventMessage);
    fixture.detectChanges();

    const errorNode = fixture.nativeElement.querySelector('.err');
    expect(errorNode).toBeTruthy();
    expect(errorNode.textContent).toContain('No pudimos iniciar sesión');
  });

  it('redirects to dashboard if already authenticated', () => {
    authMock.isAuthenticated.mockReturnValue(true);
    inProgressSubject.next(InteractionStatus.None);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });


  it('uses one current image and three indicators backed by the slide data', () => {
    expect(component.slides.length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.b-slide img').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.b-dot').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.b-img').getAttribute('src')).toBe(component.currentSlide().image);
    expect(component.activeSlide()).toBe(0);
  });

  describe('Manual carousel', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    });

    afterEach(() => {
      fixture.destroy();
      vi.useRealTimers();
    });

    const assets = [
      '/branding/eventomax/login/eventomax-login-produccion.jpg',
      '/branding/eventomax/login/eventomax-login-recursos.jpg',
      '/branding/eventomax/login/eventomax-login-trazabilidad.jpg',
    ];
    const labels = ['PRODUCCIÓN', 'RECURSOS', 'TRAZABILIDAD'];

    function expectSlide(index: number): void {
      fixture.detectChanges();
      expect(component.activeSlide()).toBe(index);
      expect(component.currentSlide().image).toBe(assets[index]);
      // Check the rendered source, copy and aria-current, not just the signal.
      expect(fixture.nativeElement.querySelectorAll('.b-img').length).toBe(1);
      expect(fixture.nativeElement.querySelector('.b-img').getAttribute('src')).toBe(assets[index]);
      expect(fixture.nativeElement.querySelector('.eyebrow').textContent).toBe(labels[index]);
      expect(fixture.nativeElement.querySelector('.b-copy h2').textContent).toBe(component.currentSlide().title);
      expect(fixture.nativeElement.querySelector('.b-copy p').textContent).toBe(component.currentSlide().description);
      expect(fixture.nativeElement.querySelectorAll('.b-dot[aria-current="true"]').length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.b-dot')[index].getAttribute('aria-current')).toBe('true');
    }


    it('keeps the initial slide after time passes', () => {
      vi.advanceTimersByTime(12000);
      expectSlide(0);
    });

    it('changes image, copy and current indicator only on explicit selection', () => {
      for (const index of [1, 2, 0]) {
        fixture.nativeElement.querySelectorAll('.b-dot')[index].click();
        expectSlide(index);
        vi.advanceTimersByTime(12000);
        expectSlide(index);
      }
    });

    it('does not change selection after pointer, focus or visibility events', () => {
      const dot: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.b-dot')[2];
      dot.focus();
      // Native button activation by keyboard produces a click with detail 0.
      dot.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
      const carousel = fixture.nativeElement.querySelector('.p-brand');
      for (const type of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) {
        carousel.dispatchEvent(new Event(type));
      }
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(12000);
      expectSlide(2);
      expect(dot.getAttribute('type')).toBe('button');
      expect(dot.getAttribute('aria-label')).toBe('Ir a TRAZABILIDAD');
    });
  });
});
