import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Icon } from '../../shared/ui/icon';
import { StatusChip } from '../../shared/ui/status-chip';
import { ReportsDataService, WeeklyReportItem, InventoryStats } from './reports-data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [Icon, StatusChip],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  private readonly dataService = inject(ReportsDataService);

  readonly weekly = toSignal(this.dataService.getWeeklyReport(), { initialValue: [] as readonly WeeklyReportItem[] });

  readonly total = computed(() => this.weekly().reduce((sum, item) => sum + item.productions, 0));

  readonly inventory = toSignal(this.dataService.getInventory(), { initialValue: { total: 0, reserved: 0, maintenance: 0, available: 0 } as InventoryStats });

  readonly reservedPercent = computed(() => {
    const inv = this.inventory();
    if (!inv || !inv.total) return 0;
    return Math.round((inv.reserved / inv.total) * 100);
  });

  private readonly allStatuses = toSignal(this.dataService.getStatuses(), { initialValue: [] });
  private readonly allProductions = toSignal(this.dataService.getProductions(), { initialValue: [] });

  readonly stateCounts = computed(() => this.allStatuses().map((status) => ({
    status,
    count: this.allProductions().filter((item) => item.status === status).length,
  })));

  readonly productionsCount = computed(() => this.allProductions().length);

  /** Replace the accessible placeholder with an ECharts component when reporting is integrated. */
  readonly chartOption = toSignal(this.dataService.getChartOption(), { initialValue: null });
}
