import { TestBed } from '@angular/core/testing';
import { StatusDistributionChart } from './status-distribution-chart';

describe('EMX-105 ECharts distribution', () => {
  it('binds backend counts to an accessible description, without fake values', async () => {
    await TestBed.configureTestingModule({ imports: [StatusDistributionChart] }).compileComponents();
    const fixture = TestBed.createComponent(StatusDistributionChart);
    fixture.componentRef.setInput('points', [
      { status: 'CONFIRMADO', count: 8 },
      { status: 'CERRADO', count: 2 }
    ]);
    fixture.detectChanges();
    const chart: HTMLElement = fixture.nativeElement.querySelector('[role="img"]');
    expect(chart.getAttribute('aria-label')).toContain('CONFIRMADO: 8');
    expect(chart.getAttribute('aria-label')).toContain('CERRADO: 2');
    fixture.destroy();
  });

  it('builds ordered, nonanimated bar options from the received values', async () => {
    await TestBed.configureTestingModule({ imports: [StatusDistributionChart] }).compileComponents();
    const fixture = TestBed.createComponent(StatusDistributionChart);
    fixture.componentRef.setInput('points', []);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const options = (component as unknown as {
      toOptions(points: { status: string; count: number }[]): {
        animation: boolean;
        yAxis: { data: string[] };
        series: { data: number[] }[];
      };
    }).toOptions([
      { status: 'CERRADO', count: 2 },
      { status: 'CONFIRMADO', count: 8 },
      { status: 'CANCELADO', count: -5 }
    ]);
    expect(options.animation).toBe(false);
    expect(options.yAxis.data).toEqual(['CONFIRMADO', 'CERRADO']);
    expect(options.series[0].data).toEqual([8, 2]);
    fixture.destroy();
  });
});
