import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy,
  PLATFORM_ID, effect, inject, input, signal, viewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { DailyEventCount } from './models/report.model';
import { ThemeService } from '../../core/theme/theme.service';

/**
 * Gráfico de columnas de eventos por día con ECharts (EMX-105).
 * Carga diferida en navegador con ResizeObserver y etiquetas de volumen superior.
 */
@Component({
  selector: 'emx-daily-events-chart',
  standalone: true,
  template: `
    <div #plot class="echarts-daily" role="img"
      [attr.aria-label]="'Gráfico de eventos por día: ' + description()"></div>
    @if (loadFailed()) {
      <p class="echarts-fallback" role="status">El gráfico de eventos por día no pudo cargarse.</p>
    }
  `,
  styles: [`
    :host { display: block; min-width: 0; width: 100%; }
    .echarts-daily { height: 220px; min-height: 200px; width: 100%; }
    .echarts-fallback { color: #64748B; font-size: 12px; padding: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyEventsChart implements AfterViewInit, OnDestroy {
  readonly points = input.required<readonly DailyEventCount[]>();
  private readonly plot = viewChild.required<ElementRef<HTMLDivElement>>('plot');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly themeService = inject(ThemeService, { optional: true });
  private chart: EChartsType | null = null;
  private observer: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private destroyed = false;

  readonly loadFailed = signal(false);
  readonly description = () =>
    this.points().map(p => `${p.date}: ${p.count}`).join('; ');

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

  formatDateLabel(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const day = parts[2];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const monthName = months[monthIdx] || parts[1];
        return `${day} ${monthName}`;
      }
    } catch {
      // Fallback a fecha original si falla el split
    }
    return dateStr;
  }

  toOptions(points: readonly DailyEventCount[], isDark = this.themeService?.isDark() ?? false): EChartsCoreOption {
    const valid = [...points].filter(p => Number.isFinite(p.count) && p.count >= 0);
    const dates = valid.map(p => this.formatDateLabel(p.date));
    const counts = valid.map(p => p.count);

    return {
      animation: false,
      aria: { enabled: true },
      grid: { left: 16, right: 16, top: 28, bottom: 20, containLabel: true },
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
          const typedParam = p as { name?: string; value?: number };
          return `<strong>${typedParam?.name || ''}</strong><br/>Eventos registrados: <strong>${typedParam?.value ?? 0}</strong>`;
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0' } },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#94A3B8' : '#64748B',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 11,
          fontWeight: 500,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        boundaryGap: [0, '20%'],
        splitLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' } },
        axisLabel: {
          color: isDark ? '#64748B' : '#94A3B8',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 11,
        },
      },
      series: [{
        name: 'Eventos',
        type: 'bar',
        data: counts,
        barMaxWidth: 36,
        showBackground: true,
        backgroundStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
          borderRadius: [6, 6, 0, 0]
        },
        itemStyle: {
          color: '#2563EB',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: isDark ? '#F1F5F9' : '#0F172A',
          fontWeight: 600,
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: 11,
        },
      }],
    };
  }

  private async initialize(): Promise<void> {
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
