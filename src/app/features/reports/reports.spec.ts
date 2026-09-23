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
    expect(text).toContain('La reportería avanzada estará disponible en una siguiente etapa.');
    expect(text).toContain('Los indicadores operacionales disponibles actualmente se encuentran en el Panel de control.');
  });

  it('displays the module pending icon', () => {
    const svg = fixture.nativeElement.querySelector('svg[lucideChartNoAxesCombined]');
    expect(svg).toBeTruthy();
  });

  it('provides a link back to the dashboard', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/dashboard"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Ir al panel →');
  });
});
