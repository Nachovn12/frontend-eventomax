import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  DEMO_INVENTORY,
  DEMO_PRODUCTIONS,
  DEMO_STATUSES,
  DEMO_WEEKLY_REPORT,
  DEMO_REPORT_CHART_OPTION,
} from '../../demo/eventomax.fixtures';
import { ProductionViewModel, ProductionStatus } from '../../core/models/production.model';

export interface WeeklyReportItem {
  label: string;
  period: string;
  productions: number;
}

export interface InventoryStats {
  total: number;
  reserved: number;
  maintenance: number;
  available: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsDataService {
  getWeeklyReport(): Observable<readonly WeeklyReportItem[]> {
    return of(DEMO_WEEKLY_REPORT);
  }

  getInventory(): Observable<InventoryStats> {
    return of(DEMO_INVENTORY);
  }

  getProductions(): Observable<readonly ProductionViewModel[]> {
    return of(DEMO_PRODUCTIONS);
  }

  getStatuses(): Observable<readonly ProductionStatus[]> {
    return of(DEMO_STATUSES);
  }

  getChartOption(): Observable<any> {
    return of(DEMO_REPORT_CHART_OPTION);
  }
}
