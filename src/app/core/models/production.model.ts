export type ProductionStatus =
  | 'SOLICITADO'
  | 'CONFIRMADO'
  | 'EN_MONTAJE'
  | 'EN_EJECUCION'
  | 'CERRADO'
  | 'CANCELADO';

export interface Production {
  id: number;
  organizerId: string;
  name: string;
  scheduledAt: string;
  location: string;
  status: ProductionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductionRequest {
  name: string;
  scheduledAt: string;
  location: string;
}

/**
 * View model used by the UI components.
 * Contains both mapped API fields and temporary demo fields
 * that don't exist in the current API contract yet.
 */
export interface ProductionViewModel {
  readonly id: string; // Temporarily string for demo (e.g. EMX-2401)
  readonly name: string;
  readonly client: string; // Demo
  readonly venue: string; // Maps to location later
  readonly date: string; // Demo/mapped
  readonly day: string; // Demo
  readonly month: string; // Demo
  readonly time: string; // Demo/mapped
  readonly status: ProductionStatus;
  readonly crew: string; // Demo
  readonly equipment: number; // Demo
  readonly category: string; // Demo
}
