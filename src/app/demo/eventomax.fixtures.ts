/** UI-only, fictional fixtures. Never use these records for authorization, reservations or APIs. */
export const DEMO_PERIOD = '14–20 sep 2026';
export const DEMO_STATUSES = [
  'SOLICITADO',
  'CONFIRMADO',
  'EN_MONTAJE',
  'EN_EJECUCIÓN',
  'CERRADO',
  'CANCELADO',
] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];
export interface DemoProduction {
  readonly id: string;
  readonly name: string;
  readonly client: string;
  readonly venue: string;
  readonly date: string;
  readonly day: string;
  readonly month: string;
  readonly time: string;
  readonly status: DemoStatus;
  readonly crew: string;
  readonly equipment: number;
  readonly category: string;
}
export const DEMO_PRODUCTIONS: readonly DemoProduction[] = [
  {
    id: 'EMX-2401',
    name: 'Summit Horizonte 2026',
    client: 'Horizonte Labs',
    venue: 'Centro de Convenciones · Santiago',
    date: '2026-09-14',
    day: '14',
    month: 'SEP',
    time: '09:00',
    status: 'EN_EJECUCIÓN',
    crew: 'Cuadrilla Norte',
    equipment: 24,
    category: 'Corporativo',
  },
  {
    id: 'EMX-2402',
    name: 'Festival Parque Abierto',
    client: 'Fundación Abierto',
    venue: 'Parque Bicentenario · Vitacura',
    date: '2026-09-15',
    day: '15',
    month: 'SEP',
    time: '16:00',
    status: 'EN_MONTAJE',
    crew: 'Cuadrilla Sur',
    equipment: 40,
    category: 'Festival',
  },
  {
    id: 'EMX-2403',
    name: 'Lanzamiento Aura',
    client: 'Estudio Aura',
    venue: 'Espacio Riesco · Huechuraba',
    date: '2026-09-16',
    day: '16',
    month: 'SEP',
    time: '19:30',
    status: 'CONFIRMADO',
    crew: 'Cuadrilla Centro',
    equipment: 18,
    category: 'Lanzamiento',
  },
  {
    id: 'EMX-2404',
    name: 'Encuentro de Innovación',
    client: 'Red Innova',
    venue: 'Centro Cultural · Providencia',
    date: '2026-09-17',
    day: '17',
    month: 'SEP',
    time: '10:00',
    status: 'SOLICITADO',
    crew: 'Por asignar',
    equipment: 0,
    category: 'Corporativo',
  },
  {
    id: 'EMX-2405',
    name: 'Gala Fundación Sur',
    client: 'Fundación Sur',
    venue: 'Salón Los Olivos · Las Condes',
    date: '2026-09-19',
    day: '19',
    month: 'SEP',
    time: '20:00',
    status: 'CONFIRMADO',
    crew: 'Cuadrilla Norte',
    equipment: 16,
    category: 'Gala',
  },
  {
    id: 'EMX-2406',
    name: 'Feria Diseño Local',
    client: 'Colectivo Diseño',
    venue: 'Plaza Central · Ñuñoa',
    date: '2026-09-20',
    day: '20',
    month: 'SEP',
    time: '11:00',
    status: 'SOLICITADO',
    crew: 'Por asignar',
    equipment: 0,
    category: 'Feria',
  },
  {
    id: 'EMX-2399',
    name: 'Foro Ciudad Circular',
    client: 'Ciudad Circular',
    venue: 'Teatro Municipal · Santiago',
    date: '2026-09-12',
    day: '12',
    month: 'SEP',
    time: '09:00',
    status: 'CERRADO',
    crew: 'Cuadrilla Centro',
    equipment: 0,
    category: 'Corporativo',
  },
  {
    id: 'EMX-2398',
    name: 'Sesiones de Primavera',
    client: 'Productora Prisma',
    venue: 'Patio Las Artes · Santiago',
    date: '2026-09-13',
    day: '13',
    month: 'SEP',
    time: '18:00',
    status: 'CANCELADO',
    crew: 'Sin asignación',
    equipment: 0,
    category: 'Concierto',
  },
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
    description: 'Transición de EN_MONTAJE a EN_EJECUCIÓN.',
    actor: 'Camila Rojas',
    role: 'Producer',
    status: 'EN_EJECUCIÓN',
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
    role: 'Producer',
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
    role: 'Producer',
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
    role: 'Organizer',
    status: 'SOLICITADO',
    trace: 'demo-trace-2404-02',
  },
  {
    id: 'AUD-DEMO-001',
    production: 'EMX-2399',
    name: 'Foro Ciudad Circular',
    time: '12 sep · 18:30',
    title: 'Producción cerrada',
    description: 'Transición de EN_EJECUCIÓN a CERRADO.',
    actor: 'Diego Soto',
    role: 'Producer',
    status: 'CERRADO',
    trace: 'demo-trace-2399-01',
  },
] as const;
