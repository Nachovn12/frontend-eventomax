import { ProductionViewModel, ProductionStatus } from '../core/models/production.model';
/** UI-only, fictional fixtures. Never use these records for authorization, reservations or APIs. */
export const DEMO_PERIOD = '14–20 sep 2026';
export const DEMO_STATUSES = [
  'SOLICITADO',
  'CONFIRMADO',
  'EN_MONTAJE',
  'EN_EJECUCION',
  'CERRADO',
  'CANCELADO',
] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];
export const DEMO_PRODUCTIONS: readonly ProductionViewModel[] = [
  { id: 2401, name: 'Summit Horizonte 2026', organizerId: 'horizonte', location: 'Centro de Convenciones, Santiago', scheduledAt: '2026-09-14T09:00:00Z', status: 'EN_EJECUCION', createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-10T10:00:00Z' },
  { id: 2402, name: 'Festival Parque Abierto', organizerId: 'abierto', location: 'Parque Bicentenario, Vitacura', scheduledAt: '2026-09-15T16:00:00Z', status: 'EN_MONTAJE', createdAt: '2026-09-02T10:00:00Z', updatedAt: '2026-09-12T10:00:00Z' },
  { id: 2403, name: 'Lanzamiento Aura', organizerId: 'aura', location: 'Espacio Riesco, Huechuraba', scheduledAt: '2026-09-16T19:30:00Z', status: 'CONFIRMADO', createdAt: '2026-09-03T10:00:00Z', updatedAt: '2026-09-13T10:00:00Z' },
  { id: 2404, name: 'Encuentro de Innovación', organizerId: 'innova', location: 'Centro Cultural, Providencia', scheduledAt: '2026-09-17T10:00:00Z', status: 'SOLICITADO', createdAt: '2026-09-04T10:00:00Z', updatedAt: '2026-09-04T10:00:00Z' },
  { id: 2405, name: 'Gala Fundación Sur', organizerId: 'sur', location: 'Salón Los Olivos, Las Condes', scheduledAt: '2026-09-19T20:00:00Z', status: 'CONFIRMADO', createdAt: '2026-09-05T10:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { id: 2406, name: 'Feria Diseño Local', organizerId: 'diseno', location: 'Plaza Central, Ñuñoa', scheduledAt: '2026-09-20T11:00:00Z', status: 'SOLICITADO', createdAt: '2026-09-06T10:00:00Z', updatedAt: '2026-09-06T10:00:00Z' },
  { id: 2399, name: 'Foro Ciudad Circular', organizerId: 'circular', location: 'Teatro Municipal, Santiago', scheduledAt: '2026-09-12T09:00:00Z', status: 'CERRADO', createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-13T10:00:00Z' },
  { id: 2398, name: 'Sesiones de Primavera', organizerId: 'primavera', location: 'Patio Las Artes, Santiago', scheduledAt: '2026-09-13T18:00:00Z', status: 'CANCELADO', createdAt: '2026-09-02T10:00:00Z', updatedAt: '2026-09-10T10:00:00Z' }
];
export interface DemoEquipment {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'Audio' | 'Iluminación' | 'Escenario' | 'Servicios';
  readonly stock: number;
  readonly reserved: number;
  readonly maintenance: number;
  readonly unit: string;
  readonly icon: 'sound' | 'light' | 'stage' | 'users';
}
export const DEMO_EQUIPMENT: readonly DemoEquipment[] = [
  {
    id: 'AUD-001',
    name: 'Parlante line array',
    description: 'Sistema activo · 1.200 W',
    category: 'Audio',
    stock: 32,
    reserved: 24,
    maintenance: 2,
    unit: 'unidades',
    icon: 'sound',
  },
  {
    id: 'AUD-002',
    name: 'Micrófono inalámbrico',
    description: 'UHF · receptor dual',
    category: 'Audio',
    stock: 24,
    reserved: 12,
    maintenance: 0,
    unit: 'unidades',
    icon: 'sound',
  },
  {
    id: 'ILU-001',
    name: 'Cabeza móvil LED',
    description: 'Beam · 230 W',
    category: 'Iluminación',
    stock: 40,
    reserved: 30,
    maintenance: 2,
    unit: 'unidades',
    icon: 'light',
  },
  {
    id: 'ILU-002',
    name: 'Panel LED RGBW',
    description: 'Wash · interior / exterior',
    category: 'Iluminación',
    stock: 24,
    reserved: 18,
    maintenance: 0,
    unit: 'unidades',
    icon: 'light',
  },
  {
    id: 'ESC-001',
    name: 'Tarima modular',
    description: 'Módulo de 2 × 1 m',
    category: 'Escenario',
    stock: 20,
    reserved: 10,
    maintenance: 2,
    unit: 'módulos',
    icon: 'stage',
  },
  {
    id: 'ESC-002',
    name: 'Torre de truss',
    description: 'Estructura de aluminio · 4 m',
    category: 'Escenario',
    stock: 8,
    reserved: 4,
    maintenance: 4,
    unit: 'unidades',
    icon: 'stage',
  },
  {
    id: 'SRV-001',
    name: 'Montaje técnico',
    description: 'Equipo de 4 personas · jornada de 8 h',
    category: 'Servicios',
    stock: 4,
    reserved: 3,
    maintenance: 0,
    unit: 'cuadrillas',
    icon: 'users',
  },
  {
    id: 'SRV-002',
    name: 'Operación de sonido',
    description: 'Técnico especialista · jornada de 8 h',
    category: 'Servicios',
    stock: 3,
    reserved: 2,
    maintenance: 0,
    unit: 'técnicos',
    icon: 'users',
  },
];
// Snapshot unit counts (equipment only); not real-time date-range availability.
export const DEMO_INVENTORY = DEMO_EQUIPMENT.filter((item) => item.category !== 'Servicios').reduce(
  (sum, item) => ({
    total: sum.total + item.stock,
    reserved: sum.reserved + item.reserved,
    maintenance: sum.maintenance + item.maintenance,
    available: sum.available + item.stock - item.reserved - item.maintenance,
  }),
  { total: 0, reserved: 0, maintenance: 0, available: 0 },
);
export const DEMO_WEEKLY_REPORT = [
  { label: 'S1', period: '01–06 sep', productions: 4 },
  { label: 'S2', period: '07–13 sep', productions: 7 },
  { label: 'S3', period: '14–20 sep', productions: 6 },
  { label: 'S4', period: '21–27 sep', productions: 9 },
  { label: 'S5', period: '28–30 sep', productions: 3 },
] as const;
/** Future ECharts input shape. No chart dependency or network request in this UI iteration. */
export const DEMO_REPORT_CHART_OPTION = {
  aria: { enabled: true },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: DEMO_WEEKLY_REPORT.map((point) => point.label) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: 'Producciones demo',
      type: 'bar',
      data: DEMO_WEEKLY_REPORT.map((point) => point.productions),
    },
  ],
};
export const DEMO_AUDIT = [
  {
    id: 'AUD-DEMO-005',
    production: 'EMX-2401',
    name: 'Summit Horizonte 2026',
    time: '14 sep · 09:00',
    title: 'Producción en ejecución',
    description: 'Transición de EN_MONTAJE a EN_EJECUCION.',
    actor: 'Camila Rojas',
    role: 'Productor',
    status: 'EN_EJECUCION',
    trace: 'demo-trace-2401-05',
  },
  {
    id: 'AUD-DEMO-004',
    production: 'EMX-2402',
    name: 'Festival Parque Abierto',
    time: '14 sep · 08:45',
    title: 'Comenzó el montaje',
    description: 'Transición de CONFIRMADO a EN_MONTAJE.',
    actor: 'Diego Soto',
    role: 'Productor',
    status: 'EN_MONTAJE',
    trace: 'demo-trace-2402-04',
  },
  {
    id: 'AUD-DEMO-003',
    production: 'EMX-2403',
    name: 'Lanzamiento Aura',
    time: '14 sep · 08:30',
    title: 'Producción confirmada',
    description: 'Transición de SOLICITADO a CONFIRMADO.',
    actor: 'Camila Rojas',
    role: 'Productor',
    status: 'CONFIRMADO',
    trace: 'demo-trace-2403-03',
  },
  {
    id: 'AUD-DEMO-002',
    production: 'EMX-2404',
    name: 'Encuentro de Innovación',
    time: '14 sep · 08:15',
    title: 'Nueva solicitud recibida',
    description: 'Solicitud creada con estado SOLICITADO.',
    actor: 'Martina Díaz',
    role: 'Organizador',
    status: 'SOLICITADO',
    trace: 'demo-trace-2404-02',
  },
  {
    id: 'AUD-DEMO-001',
    production: 'EMX-2399',
    name: 'Foro Ciudad Circular',
    time: '12 sep · 18:30',
    title: 'Producción cerrada',
    description: 'Transición de EN_EJECUCION a CERRADO.',
    actor: 'Diego Soto',
    role: 'Productor',
    status: 'CERRADO',
    trace: 'demo-trace-2399-01',
  },
] as const;
