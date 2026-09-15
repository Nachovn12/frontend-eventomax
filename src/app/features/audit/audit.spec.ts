import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Audit } from './audit';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

describe('Audit', () => {
  let fixture: ComponentFixture<Audit>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [
        provideRouter([]),
        { provide: AuthorizationService, useValue: { roles: () => [AppRole.Auditor] } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Audit);
    fixture.detectChanges();
  });
  it('shows an Auditor read-only timeline with inspectable traces', () => {
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Auditoría');
    expect(fixture.componentInstance.displayRole()).toBe('Auditor');
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Solo lectura');

    expect(fixture.nativeElement.querySelector('details dd').textContent).toBe('AUD-DEMO-005');
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).map((button) => button.textContent?.trim());
    expect(buttons).toEqual(['Limpiar']);
  });
  it('filters by production and actor, then restores the timeline', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#audit-production');
    select.value = 'EMX-2401';
    select.dispatchEvent(new Event('change'));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#audit-search');
    input.value = 'CAMILA';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(1);
    input.value = 'Diego';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay actividad con estos filtros');
    fixture.nativeElement.querySelector('.empty-state button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(5);
  });
  it('keeps the return link to the dashboard', () => {
    expect(fixture.nativeElement.querySelector('a.btn-primary').getAttribute('href')).toBe(
      '/dashboard',
    );
  });
});
