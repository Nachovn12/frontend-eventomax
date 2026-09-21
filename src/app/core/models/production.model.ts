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

export type ProductionViewModel = Production;
