import { Injectable } from '@angular/core';
import {
  DEMO_INVENTORY,
  DEMO_PRODUCTIONS,
  DEMO_STATUSES,
  DEMO_WEEKLY_REPORT,
  DEMO_REPORT_CHART_OPTION,
} from '../../demo/eventomax.fixtures';

@Injectable({ providedIn: 'root' })
export class ReportsDataService {
  getWeeklyReport() {
    return DEMO_WEEKLY_REPORT;
  }

  getInventory() {
    return DEMO_INVENTORY;
  }

  getProductions() {
    return DEMO_PRODUCTIONS;
  }

  getStatuses() {
    return DEMO_STATUSES;
  }

  getChartOption() {
    return DEMO_REPORT_CHART_OPTION;
  }
}
