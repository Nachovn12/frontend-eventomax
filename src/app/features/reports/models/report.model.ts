import { ProductionStatus } from '../../../core/models/production.model';

export type ReportRange = 'last24h' | 'last7d';

/**
 * Read-model del contrato real de ms-eventomax-report (EMX-68/80).
 * Solo incluye transiciones Kafka observadas; NO todas las producciones.
 */
export interface ReportTransition {
  readonly previousStatus: ProductionStatus;
  readonly newStatus: ProductionStatus;
  readonly count: number;
}

export interface ReportMetrics {
  readonly totalStatusChanges: number;
  readonly currentStatusDistribution: Partial<Record<ProductionStatus, number>>;
  readonly transitions: readonly ReportTransition[];
  readonly cancelledCount: number;
  readonly closedCount: number;
}

export interface ReportKpisResponse {
  readonly range: ReportRange;
  readonly from: string;
  readonly to: string;
  readonly generatedAt: string;
  readonly partialCoverage: {
    readonly isPartial: boolean;
    readonly description: string;
  };
  readonly metrics: ReportMetrics;
}

export interface TopServiceItem {
  readonly serviceId: number;
  readonly serviceName: string;
  readonly hireCount: number;
}

export interface ReportTopServicesResponse {
  readonly range: ReportRange;
  readonly from: string;
  readonly to: string;
  readonly generatedAt: string;
  readonly partialCoverage: {
    readonly isPartial: boolean;
    readonly description: string;
  };
  readonly items: readonly TopServiceItem[];
}
