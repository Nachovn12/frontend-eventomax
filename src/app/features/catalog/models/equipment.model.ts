export interface Equipment {
  readonly id: number;
  readonly name: string;
  readonly description?: string | null;
  readonly category?: string | null;
  readonly imageUrl?: string | null;
  readonly active: boolean;
  readonly availableQty: number;
  readonly reservedQty: number;
  readonly totalQuantity: number;
  readonly availableQuantity: number;
  readonly status: string;
}

export interface CreateEquipmentRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly active: boolean;
  readonly initialAvailableQty: number;
  readonly imageUrl?: string | null;
}

export interface EquipmentUpdateRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly active: boolean;
  readonly availableQty?: number;
  readonly imageUrl?: string | null;
}

export interface EquipmentReservationItem {
  readonly reservationId: number;
  readonly equipmentId: number;
  readonly equipmentName: string;
  readonly quantity: number;
  readonly status: string;
}

export interface BackendEquipmentResponse {
  readonly id: number;
  readonly name: string;
  readonly description?: string | null;
  readonly category?: string | null;
  readonly imageUrl?: string | null;
  readonly active?: boolean | null;
  readonly availableQty?: number | null;
  readonly reservedQty?: number | null;
  readonly totalQuantity?: number | null;
  readonly availableQuantity?: number | null;
  readonly status?: string | null;
}

