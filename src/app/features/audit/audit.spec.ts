import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Audit } from './audit';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

describe('Audit Component', () => {
  let component: Audit;
  let fixture: ComponentFixture<Audit>;
  let authzMock: any;
  let rolesSignal: WritableSignal<AppRole[]>;

  beforeEach(async () => {
    rolesSignal = signal([]);

    authzMock = {
      roles: () => rolesSignal(),
    };

    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [
        provideRouter([]),
        { provide: AuthorizationService, useValue: authzMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Audit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and render the title', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Auditoría');
  });

  it('should display "Auditor" when user has Auditor role', () => {
    rolesSignal.set([AppRole.Auditor]);
    expect(component.displayRole()).toBe('Auditor');
  });

  it('should have a link to go back to dashboard', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a.btn-primary');
    expect(link?.getAttribute('href')).toBe('/dashboard');
  });
});
