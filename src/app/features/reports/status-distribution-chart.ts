import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
  PLATFORM_ID, effect, inject, input, signal, viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { ThemeService } from '../../core/theme/theme.service';

export interface StatusChartPoint {
  readonly status: string;
  readonly count: number;
}

const STATUS_COLORS: Record<string, string> = {
  SOLICITADO: '#F59E0B',
  CONFIRMADO: '#2563EB',
  EN_MONTAJE: '#6366F1',
  EN_EJECUCION: '#0EA5E9',
  CERRADO: '#10B981',
  CANCELADO: '#EF4444',
};

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
    .echarts-status { height: 220px; min-height: 200px; width: 100%; }
    .echarts-fallback { color: var(--text-muted); font-size: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusDistributionChart implements AfterViewInit, OnDestroy {
  readonly points = input.required<readonly StatusChartPoint[]>();
  private readonly plot = viewChild.required<ElementRef<HTMLDivElement>>('plot');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly themeService = inject(ThemeService, { optional: true });
  private chart: EChartsType | null = null;
  private observer: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private destroyed = false;

  readonly loadFailed = signal(false);
  readonly description = () =>
    this.points().map(p => `${p.status}: ${p.count}`).join('; ');

  constructor() {
    effect(() => {
      const points = this.points();
      const isDark = this.resolveIsDark();
      if (this.chart) {
        this.chart.setOption(this.toOptions(points, isDark), true);
      }
    });
  }

  private resolveIsDark(): boolean {
    if (this.themeService) {
      return this.themeService.isDark();
    }
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
    }
    return false;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.initialize();
      if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
        this.themeObserver = new MutationObserver(() => {
          if (this.chart) {
            this.chart.setOption(this.toOptions(this.points(), this.resolveIsDark()), true);
          }
        });
        this.themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'class'],
        });
      }
    }
  }

  private toOptions(points: readonly StatusChartPoint[], isDark = this.themeService?.isDark() ?? false): EChartsCoreOption {
    const sorted = [...points]
      .filter(p => Number.isFinite(p.count) && p.count >= 0)
      .sort((a, b) => b.count - a.count);
    return {
      animation: false,
      aria: { enabled: true },
      grid: { left: 12, right: 36, top: 18, bottom: 22, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(241, 245, 249, 0.6)' } },
        backgroundColor: isDark ? '#16171F' : '#0F172A',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#1E293B',
        textStyle: { color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif', fontSize: 12 },
        padding: [8, 12],
        borderRadius: 8,
        extraCssText: isDark
          ? 'box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.14), 0 12px 32px 0 rgba(0, 0, 0, 0.65);'
          : 'box-shadow: 0 10px 38px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08);',
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const typed = p as { name?: string; value?: number; color?: string };
          const labels: Record<string, string> = {
            SOLICITADO: 'Solicitado',
            CONFIRMADO: 'Confirmado',
            EN_MONTAJE: 'En montaje',
            EN_EJECUCION: 'En ejecución',
            CERRADO: 'Cerrado',
            CANCELADO: 'Cancelado',
          };
          const label = (typed?.name && labels[typed.name]) || typed?.name || '';
          return `<strong>${label}</strong><br/>Producciones en estado: <strong>${typed?.value ?? 0}</strong>`;
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        boundaryGap: [0, '25%'],
        splitLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' } },
        axisLabel: { color: isDark ? '#64748B' : '#94A3B8', fontFamily: 'Inter, -apple-system, sans-serif' },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: sorted.map(p => p.status),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          width: 112,
          overflow: 'truncate',
          color: isDark ? '#94A3B8' : '#475569',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 12,
          formatter: (val: string) => {
            const labels: Record<string, string> = {
              SOLICITADO: 'Solicitado',
              CONFIRMADO: 'Confirmado',
              EN_MONTAJE: 'En montaje',
              EN_EJECUCION: 'En ejecución',
              CERRADO: 'Cerrado',
              CANCELADO: 'Cancelado',
            };
            return labels[val] ?? val;
          },
        },
      },
      series: [{
        name: 'Transiciones observadas',
        type: 'bar',
        data: sorted.map(p => p.count),
        showBackground: true,
        backgroundStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
          borderRadius: [0, 6, 6, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: isDark ? '#F1F5F9' : '#1E293B',
          fontWeight: 600,
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 12,
        },
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const status = sorted[params.dataIndex]?.status;
            return STATUS_COLORS[status] ?? '#2563EB';
          },
          borderRadius: [0, 6, 6, 0],
        },
        barMaxWidth: 20,
      }],
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
      this.chart.setOption(this.toOptions(this.points(), this.resolveIsDark()));
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
    this.themeObserver?.disconnect();
    this.chart?.dispose();
  }
}
