export interface CatalogService {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly rate: number;
  readonly active: boolean;
}

export interface CatalogServiceUpsertRequest {
  name: string;
  description: string | null;
  rate: number;
  active: boolean;
}
