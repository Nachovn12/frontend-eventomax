import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Icon } from '../../shared/ui/icon';
import { StatusChip } from '../../shared/ui/status-chip';
import { ReportsDataService } from './reports-data.service';

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

  readonly weekly = this.dataService.getWeeklyReport();
  readonly total = this.dataService.getWeeklyReport().reduce((sum, item) => sum + item.productions, 0);
  readonly inventory = this.dataService.getInventory();
  readonly reservedPercent = Math.round((this.dataService.getInventory().reserved / this.dataService.getInventory().total) * 100);
  readonly stateCounts = this.dataService.getStatuses().map((status) => ({
    status,
    count: this.dataService.getProductions().filter((item) => item.status === status).length,
  }));
  readonly productionsCount = this.dataService.getProductions().length;
  /** Replace the accessible placeholder with an ECharts component when reporting is integrated. */
  readonly chartOption = this.dataService.getChartOption();
}
