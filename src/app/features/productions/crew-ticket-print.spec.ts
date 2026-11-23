import { describe, it, expect } from 'vitest';
import { buildCrewTicketPrintHtml, CrewTicketPrintData } from './crew-ticket-print';
import { CrewTicket } from '../../core/models/production.model';
import { EquipmentReservationItem } from '../catalog/models/equipment.model';

describe('buildCrewTicketPrintHtml', () => {
  it('generates a realistic Chilean DTE Work Order (Ticket de Cuadrilla) for Production 1', () => {
    const ticket: CrewTicket = {
      id: 11,
      productionId: 1,
      productionName: 'Festival Tecnológico del Biobío 2026',
      eventId: 'a1e041d8-7911-4b10-8b01-5278cba91001',
      status: 'CERRADO',
      scheduledAt: '2026-11-20T18:00:00Z',
      location: 'Centro de Eventos SurActivo — Concepción',
      instructions: "Hoja de ruta para montaje de equipamiento de la producción 'Festival Tecnológico del Biobío 2026' en recinto: Centro de Eventos SurActivo — Concepción. Estado operacional: CERRADO. Cuadrilla asignada: Cuadrilla Técnica Biobío (Concepción Sur) (crew-biobio-sur). Protocolos SEC y EPP vigentes.",
      createdAt: '2026-10-19T19:05:26Z',
      updatedAt: '2026-10-19T22:57:22Z',
    };

    const reservations: EquipmentReservationItem[] = [
      {
        reservationId: 101,
        equipmentId: 1,
        equipmentName: 'Consola Digital DiGiCo Quantum 338',
        quantity: 1,
        status: 'RESERVED',
      },
      {
        reservationId: 102,
        equipmentId: 2,
        equipmentName: 'Arreglo Lineal Acústico Meyer Sound LYON-M',
        quantity: 8,
        status: 'RESERVED',
      },
      {
        reservationId: 103,
        equipmentId: 3,
        equipmentName: 'Subwoofer de Gran Potencia Meyer Sound 1100-LFC',
        quantity: 4,
        status: 'RESERVED',
      },
      {
        reservationId: 104,
        equipmentId: 6,
        equipmentName: 'Panel LED Modular Unilumin Utile P3.91 (50x50cm)',
        quantity: 24,
        status: 'RESERVED',
      },
      {
        reservationId: 105,
        equipmentId: 5,
        equipmentName: 'Generador Diésel Insonorizado Cummins 150 kVA',
        quantity: 1,
        status: 'RESERVED',
      },
    ];

    const data: CrewTicketPrintData = {
      ticket,
      crewName: 'Cuadrilla Técnica Biobío (Concepción Sur)',
      crewId: 'crew-biobio-sur',
      directive: "Hoja de ruta para montaje de equipamiento de la producción 'Festival Tecnológico del Biobío 2026' en recinto: Centro de Eventos SurActivo — Concepción. Estado operacional: CERRADO. Cuadrilla asignada: Cuadrilla Técnica Biobío (Concepción Sur) (crew-biobio-sur). Protocolos SEC y EPP vigentes.",
      statusLabel: 'Cerrado',
      productionStatusLabel: 'Cerrado',
      organizerId: 'org-innovacion-biobio',
      actorOwnerId: 'admin.operaciones',
      reservations,
    };

    const html = buildCrewTicketPrintHtml(data);

    expect(html).toContain('Corporación de Innovación y Desarrollo del Biobío');
    expect(html).toContain('76.842.190-5');
    expect(html).toContain('Centro de Eventos SurActivo — Concepción');
    expect(html).toContain('Cuadrilla Técnica Biobío (Concepción Sur)');
    expect(html).toContain('crew-biobio-sur');
    expect(html).toContain('Consola Digital DiGiCo Quantum 338');
    expect(html).toContain('Arreglo Lineal Acústico Meyer Sound LYON-M');
    expect(html).toContain('Subwoofer de Gran Potencia Meyer Sound 1100-LFC');
    expect(html).toContain('Panel LED Modular Unilumin Utile P3.91 (50x50cm)');
    expect(html).toContain('Generador Diésel Insonorizado Cummins 150 kVA');
    expect(html).toContain('OT-0011');
    expect(html).toContain('pdf417-svg');
  });

  it('generates a realistic Chilean DTE Work Order (Ticket de Cuadrilla) for Production 2', () => {
    const ticket: CrewTicket = {
      id: 12,
      productionId: 2,
      productionName: 'Festival Internacional de Jazz de Concepción',
      eventId: 'b2f152e9-8922-4c21-9c12-6389dcb02002',
      status: 'CERRADO',
      scheduledAt: '2026-12-05T19:30:00Z',
      location: 'Parque Bicentenario, Concepción',
      instructions: "Hoja de ruta para montaje de equipamiento de la producción 'Festival Internacional de Jazz de Concepción' en recinto: Parque Bicentenario, Concepción. Estado operacional: CERRADO. Cuadrilla asignada: Cuadrilla Acústica & FOH Biobío (Concepción) (crew-jazz-biobio). Calibración electroacústica y certificación SEC.",
      createdAt: '2026-10-25T14:00:00Z',
      updatedAt: '2026-11-05T22:19:37Z',
    };

    const reservations: EquipmentReservationItem[] = [
      {
        reservationId: 201,
        equipmentId: 1,
        equipmentName: 'Consola Digital DiGiCo Quantum 338',
        quantity: 1,
        status: 'RESERVED',
      },
      {
        reservationId: 202,
        equipmentId: 2,
        equipmentName: 'Arreglo Lineal Acústico Meyer Sound LYON-M',
        quantity: 12,
        status: 'RESERVED',
      },
      {
        reservationId: 203,
        equipmentId: 3,
        equipmentName: 'Subwoofer de Gran Potencia Meyer Sound 1100-LFC',
        quantity: 6,
        status: 'RESERVED',
      },
      {
        reservationId: 204,
        equipmentId: 4,
        equipmentName: 'Cabezal Móvil Robótico Robe MegaPointe 470W',
        quantity: 8,
        status: 'RESERVED',
      },
    ];

    const data: CrewTicketPrintData = {
      ticket,
      crewName: 'Cuadrilla Acústica & FOH Biobío (Concepción)',
      crewId: 'crew-jazz-biobio',
      directive: "Hoja de ruta para montaje de equipamiento de la producción 'Festival Internacional de Jazz de Concepción' en recinto: Parque Bicentenario, Concepción. Estado operacional: CERRADO. Cuadrilla asignada: Cuadrilla Acústica & FOH Biobío (Concepción) (crew-jazz-biobio). Calibración electroacústica y certificación SEC.",
      statusLabel: 'Cerrado',
      productionStatusLabel: 'Cerrado',
      organizerId: 'org-cultura-concepcion',
      actorOwnerId: 'admin.operaciones',
      reservations,
    };

    const html = buildCrewTicketPrintHtml(data);

    expect(html).toContain('Corporación Cultural de Concepción');
    expect(html).toContain('65.014.280-3');
    expect(html).toContain('Parque Bicentenario, Concepción');
    expect(html).toContain('crew-jazz-biobio');
    expect(html).toContain('OT-0012');
  });

  it('prints real Entra organizerDisplayName and hides raw canonical UUID when unavailable', () => {
    const rawCanonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:7d300514-1e39-4013-85e5-02efa3fd42df';
    const ticket: CrewTicket = {
      id: 20,
      productionId: 10,
      productionName: 'Evento Producción 10',
      eventId: 'c3f152e9-8922-4c21-9c12-6389dcb02010',
      status: 'EN_MONTAJE',
      scheduledAt: '2030-11-24T19:00:00Z',
      location: 'Centro Eventos Santiago',
      instructions: 'Montaje estándar.',
      createdAt: '2026-11-22T10:00:00Z',
      updatedAt: '2026-11-22T10:00:00Z',
    };

    const htmlResolved = buildCrewTicketPrintHtml({
      ticket,
      crewName: 'Cuadrilla Alpha',
      crewId: 'crew-01',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      reservations: [],
      organizerId: rawCanonicalId,
      organizerDisplayName: 'Ignacio Valeria',
      organizerResolutionSource: 'ENTRA_GRAPH',
    });
    expect(htmlResolved).toContain('Ignacio Valeria');
    expect(htmlResolved).not.toContain(rawCanonicalId);

    const htmlUnresolved = buildCrewTicketPrintHtml({
      ticket,
      crewName: 'Cuadrilla Alpha',
      crewId: 'crew-01',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      reservations: [],
      organizerId: rawCanonicalId,
      organizerDisplayName: null,
      organizerResolutionSource: 'UNRESOLVED',
    });
    expect(htmlUnresolved).toContain('Organizador no disponible');
    expect(htmlUnresolved).not.toContain(rawCanonicalId);
  });
});
