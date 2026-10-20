import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
  PLATFORM_ID, effect, inject, input, signal, viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';

export interface StatusChartPoint {
  readonly status: string;
  readonly count: number;
}

/**
 * ECharts SVG con carga diferida. Solo se instancia en navegador con ResizeObserver;
 * conserva el listado textual de Report como alternativa accesible (EMX-105).
 */
@Component({
  selector: 'emx-status-distribution-chart',
  standalone: true,
  template: `
    <div #plot class="echarts-status" role="img"
      [attr.aria-label]="'Gráfico ECharts: ' + description()"></div>
    @if (loadFailed()) {
      <p class="echarts-fallback" role="status">El gráfico no pudo cargarse. Los mismos datos están disponibles en el listado.</p>
    }
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .echarts-status { height: 300px; min-height: 250px; width: 100%; }
    .echarts-fallback { color: var(--text-muted); font-size: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusDistributionChart implements AfterViewInit, OnDestroy {
  readonly points = input.required<readonly StatusChartPoint[]>();
  private readonly plot = viewChild.required<ElementRef<HTMLDivElement>>('plot');
  private readonly platformId = inject(PLATFORM_ID);
  private chart: EChartsType | null = null;
  private observer: ResizeObserver | null = null;
  private destroyed = false;

  readonly loadFailed = signal(false);
  readonly description = () =>
    this.points().map(p => `${p.status}: ${p.count}`).join('; ');

  constructor() {
    effect(() => {
      const points = this.points();
      if (this.chart) {
        this.chart.setOption(this.toOptions(points), true);
      }
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.initialize();
    }
  }

  private toOptions(points: readonly StatusChartPoint[]): EChartsCoreOption {
    const sorted = [...points]
      .filter(p => Number.isFinite(p.count) && p.count >= 0)
      .sort((a, b) => b.count - a.count);
    return {
      animation: false,
      aria: { enabled: true },
      grid: { left: 125, right: 42, top: 18, bottom: 22 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', min: 0, minInterval: 1 },
      yAxis: {
        type: 'category',
        inverse: true,
        data: sorted.map(p => p.status),
        axisLabel: { width: 112, overflow: 'truncate' }
      },
      series: [{
        name: 'Transiciones observadas',
        type: 'bar',
        data: sorted.map(p => p.count),
        label: { show: true, position: 'right' },
        itemStyle: { color: '#2563eb' },
        barMaxWidth: 26
      }]
    };
  }

  private async initialize(): Promise<void> {
    // Vitest/jsdom no necesita un lienzo real; en producción los navegadores modernos soportan ResizeObserver.
    if (typeof ResizeObserver === 'undefined') return;
    try {
      const [echarts, charts, components, renderers] = await Promise.all([
        import('echarts/core'),
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers')
      ]);
      if (this.destroyed) return;
      echarts.use([
        charts.BarChart,
        components.GridComponent,
        components.TooltipComponent,
        components.AriaComponent,
        renderers.SVGRenderer
      ]);
      this.chart = echarts.init(this.plot().nativeElement, undefined, { renderer: 'svg' });
      this.chart.setOption(this.toOptions(this.points()));
      this.observer = new ResizeObserver(() => this.chart?.resize());
      this.observer.observe(this.plot().nativeElement);
    } catch {
      // La lectura accesible de estados permanece disponible si el gráfico falla.
      if (!this.destroyed) this.loadFailed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.chart?.dispose();
  }
}
