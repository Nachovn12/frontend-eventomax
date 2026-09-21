import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Reports } from './reports';

describe('Reports Component', () => {
  let fixture: ComponentFixture<Reports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
  });

  it('renders pending state for reports without fake metrics or data services', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Reportes y analítica');
    expect(text).toContain('La reportería avanzada se habilitará en una siguiente etapa de la plataforma.');
  });

  it('displays the module pending icon', () => {
    const icon = fixture.nativeElement.querySelector('emx-icon[name="chart"]');
    expect(icon).toBeTruthy();
  });

  it('provides a link back to the dashboard', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/dashboard"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Volver al panel');
  });
});
