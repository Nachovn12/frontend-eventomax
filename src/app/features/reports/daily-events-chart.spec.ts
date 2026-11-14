import { TestBed } from '@angular/core/testing';
import { DailyEventsChart } from './daily-events-chart';

describe('DailyEventsChart', () => {
  it('binds daily points to an accessible description', async () => {
    await TestBed.configureTestingModule({ imports: [DailyEventsChart] }).compileComponents();
    const fixture = TestBed.createComponent(DailyEventsChart);
    fixture.componentRef.setInput('points', [
      { date: '2026-11-06', count: 1 },
      { date: '2026-11-07', count: 4 }
    ]);
    fixture.detectChanges();
    const chart: HTMLElement = fixture.nativeElement.querySelector('[role="img"]');
    expect(chart.getAttribute('aria-label')).toContain('2026-11-06: 1');
    expect(chart.getAttribute('aria-label')).toContain('2026-11-07: 4');
    fixture.destroy();
  });

  it('formats date labels and builds bar series options', async () => {
    await TestBed.configureTestingModule({ imports: [DailyEventsChart] }).compileComponents();
    const fixture = TestBed.createComponent(DailyEventsChart);
    fixture.componentRef.setInput('points', []);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.formatDateLabel('2026-11-07')).toBe('07 nov');

    const options = (component as unknown as {
      toOptions(points: { date: string; count: number }[]): {
        animation: boolean;
        xAxis: { data: string[] };
        series: { data: number[] }[];
      };
    }).toOptions([
      { date: '2026-11-06', count: 2 },
      { date: '2026-11-07', count: 5 }
    ]);

    expect(options.animation).toBe(false);
    expect(options.xAxis.data).toEqual(['06 nov', '07 nov']);
    expect(options.series[0].data).toEqual([2, 5]);
    fixture.destroy();
  });
});
