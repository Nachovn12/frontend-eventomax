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
  crewId?: string;
  crewName?: string;
}

export interface CreateProductionRequest {
  organizerId: string;
  name: string;
  scheduledAt: string;
  location: string;
}

export interface ProductionReservationItemRequest {
  readonly equipmentId: number;
  readonly quantity: number;
}

export interface ProductionStatusUpdateRequest {
  status: ProductionStatus;
  items?: readonly ProductionReservationItemRequest[];
  serviceIds?: readonly number[];
  crewId?: string;
  crewName?: string;
}

export type ProductionViewModel = Production;

export interface CrewTicket {
  readonly id: number;
  readonly productionId: number;
  readonly eventId: string;
  readonly productionName: string;
  readonly scheduledAt: string;
  readonly location: string;
  readonly status: ProductionStatus;
  readonly instructions?: string;
  readonly crewId?: string;
  readonly crewName?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrganizerContact {
  readonly id: number;
  readonly organizerId: string;
  readonly email: string;
  readonly contactName?: string | null;
  readonly phone?: string | null;
  readonly userOid?: string | null;
  readonly active: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface OrganizerContactRequest {
  email: string;
  contactName?: string;
  phone?: string;
  userOid?: string;
}
