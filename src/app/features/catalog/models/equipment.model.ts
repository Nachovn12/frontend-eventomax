export type EquipmentCategory = 'Audio' | 'Iluminación' | 'Escenario' | 'Servicios';
export type EquipmentIcon = 'sound' | 'light' | 'stage' | 'users';

export interface Equipment {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: EquipmentCategory;
  readonly stock: number;
  readonly reserved: number;
  readonly maintenance: number;
  readonly unit: string;
  readonly icon: EquipmentIcon;
}
