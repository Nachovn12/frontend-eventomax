import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Reports } from './reports';

describe('Reports', () => {
  let fixture: ComponentFixture<Reports>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Reports] }).compileComponents();
    fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
  });
  it('provides an accessible data table matching the future ECharts series', () => {
    const data = fixture.componentInstance.chartOption()?.series[0].data;
    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.chart-data tbody tr td:last-child'),
    ).map((cell) => Number(cell.textContent));
    expect(cells).toEqual(data);
    expect(cells.reduce((sum, value) => sum + value, 0)).toBe(fixture.componentInstance.total());
    expect(fixture.nativeElement.querySelector('.bar-chart').getAttribute('aria-label')).toContain(
      'demo',
    );
  });
  it('distinguishes the monthly illustration from the sample event listing', () => {

    expect(fixture.nativeElement.textContent).toContain('independientes del listado');
    expect(fixture.componentInstance.stateCounts().reduce((sum: number, item: any) => sum + item.count, 0)).toBe(
      fixture.componentInstance.productionsCount(),
    );
  });
});
