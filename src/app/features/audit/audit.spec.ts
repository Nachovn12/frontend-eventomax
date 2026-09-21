import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Audit } from './audit';

describe('Audit Component', () => {
  let fixture: ComponentFixture<Audit>;
  const roles = signal<AppRole[]>([]);

  beforeEach(async () => {
    roles.set([AppRole.Auditor]);

    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [
        provideRouter([]),
        { provide: AuthorizationService, useValue: { roles } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Audit);
    fixture.detectChanges();
  });

  it('renders pending state for audit without fake timelines or data services', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Auditoría y trazabilidad');
    expect(text).toContain('El historial de eventos estará disponible cuando el servicio de auditoría sea habilitado.');
    expect(text).toContain('Identidad activa: Auditor');
  });

  it('displays the security shield icon for the pending state', () => {
    const icon = fixture.nativeElement.querySelector('emx-icon[name="shield"]');
    expect(icon).toBeTruthy();
  });

  it('provides a safe exit link to the dashboard', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/dashboard"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Ir al Dashboard');
  });
});
