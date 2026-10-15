export interface Equipment {
  readonly id: number;
  readonly name: string;
  readonly category: string;
  readonly totalQuantity: number;
  readonly availableQuantity: number;
  readonly status: string;
}

export interface CreateEquipmentRequest {
  readonly name: string;
  readonly category: string;
  readonly totalQuantity: number;
}

export interface EquipmentReservationItem {
  readonly reservationId: number;
  readonly equipmentId: number;
  readonly equipmentName: string;
  readonly quantity: number;
  readonly status: string;
}

