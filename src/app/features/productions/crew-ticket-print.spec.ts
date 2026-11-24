import { describe, it, expect, vi } from 'vitest';
import {
  buildCrewTicketPrintHtml,
  buildCrewTicketQrPayload,
  CrewTicketPrintData,
  formatChileEventDateTime,
  formatServerTimestampChile,
  formatServerTimestampUtc,
  parseServerTimestampAsUtc,
  removeExistingCrewTicketPrintFrame,
  triggerCrewTicketPrint,
} from './crew-ticket-print';
import { buildInternalTraceabilityQrSvg, encodeQrMatrix } from './crew-ticket-qr';
import { CrewTicket } from '../../core/models/production.model';
import { EquipmentReservationItem } from '../catalog/models/equipment.model';

function makeTicket(overrides: Partial<CrewTicket> = {}): CrewTicket {
  return {
    id: 7,
    productionId: 15,
    productionName: 'Cumbre Regional de Ingeniería Cloud 2026',
    eventId: '4c8f11b2-3e91-4d80-a772-9102f6c1a234',
    status: 'EN_MONTAJE',
    scheduledAt: '2026-11-25T09:00:00',
    location: 'Centro de Convenciones Biobío, Concepción',
    instructions: 'Verificar dotación técnica y conexiones de energía/sonido.',
    createdAt: '2026-11-23T02:03:24.116572',
    updatedAt: '2026-11-23T02:03:24.116572',
    ...overrides,
  };
}

function makeReservation(index: number, overrides: Partial<EquipmentReservationItem> = {}): EquipmentReservationItem {
  return {
    reservationId: 100 + index,
    equipmentId: index,
    equipmentName: `Equipo Técnico #${index}`,
    quantity: 1,
    status: 'RESERVED',
    ...overrides,
  };
}

describe('buildCrewTicketPrintHtml (Propuesta C v2)', () => {
  it('1. renders a complete C v2 work order for a production with one reservation without SII, RUT or fake defaults', () => {
    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket(),
      crewName: 'Cuadrilla Técnica Audiovisual Sur',
      crewId: 'crew-sur-av-01',
      directive: 'Verificar dotación técnica y conexiones de energía/sonido.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'En montaje',
      productionStatusCode: 'EN_MONTAJE',
      productionQueriedAt: '2026-11-23T15:00:00Z',
      organizerId: 'f191bdc8-7926-4722-9ec0-cba663701940:11111111-2222-3333-4444-555555555555',
      organizerDisplayName: 'Camila Rojas Soto',
      organizerResolutionSource: 'ENTRA_GRAPH',
      reservations: [
        makeReservation(7, {
          reservationId: 6,
          equipmentName: 'Micrófono Inalámbrico Shure Axient Digital AD4Q',
          quantity: 1,
        }),
      ],
    });

    // Core C v2 structure & branding
    expect(html).toContain('emx-official-logo');
    expect(html).toContain('#024ffc');
    expect(html).toContain('Orden de Trabajo Técnica');
    expect(html).toContain('OT-0007 · Producción #15');
    expect(html).toContain('EMX-OT-PRD-15-0007');
    expect(html).toContain('Cumbre Regional de Ingeniería Cloud 2026');
    expect(html).toContain('Camila Rojas Soto');
    expect(html).toContain('ID interno protegido (directorio Entra ID)');
    expect(html).not.toContain('11111111-2222-3333-4444-555555555555');

    // Crew name & ID cleanly separated
    expect(html).toContain('Cuadrilla Técnica Audiovisual Sur');
    expect(html).toContain('<span class="id-tag">crew-sur-av-01</span>');

    // Equipment manifest & honest dispatch wording
    expect(html).toContain('EQ-007');
    expect(html).toContain('#6 (RES-0006)');
    expect(html).toContain('Micrófono Inalámbrico Shure Axient Digital AD4Q');
    expect(html).toContain('1 unidad');
    expect(html).toContain('RESERVED');
    expect(html).toContain('Despacho: Sin registro disponible');
    expect(html).not.toContain('0 u.');
    expect(html).not.toContain('Control Despacho Bodega');

    // Three custody signature blocks
    expect(html).toContain('Entrega / Despacho Bodega');
    expect(html).toContain('Responsable de Cuadrilla');
    expect(html).toContain('Recepción en Terreno / Producción');

    // Internal QR & traceability confined to traceability block
    expect(html).toContain('emx-trace-qr');
    expect(html).toContain('QR Interno');
    expect(html).toContain('4c8f11b2-3e91-4d80-a772-9102f6c1a234');
    expect(html).toContain('no constituye validación criptográfica ni verificación en línea');

    // Forbidden legacy DTE/SII/fake fields completely absent
    expect(html).not.toContain('EVENTOMAX SpA');
    expect(html).not.toContain('77.892.410-K');
    expect(html).not.toContain('S.I.I.');
    expect(html).not.toContain('www.sii.cl');
    expect(html).not.toContain('19.799');
    expect(html).not.toContain('TIMBRE OPERATIVO EVENTOMAX');
    expect(html).not.toContain('pdf417-svg');
    expect(html).not.toContain('Despacho Central Operaciones');
  });

  it('2. renders multiple equipment reservations with accurate item and unit totals', () => {
    const reservations: EquipmentReservationItem[] = [
      makeReservation(1, { equipmentName: 'Consola Digital DiGiCo Quantum 338', quantity: 1 }),
      makeReservation(2, { equipmentName: 'Arreglo Lineal Meyer Sound LYON-M', quantity: 8 }),
      makeReservation(3, { equipmentName: 'Subwoofer Meyer Sound 1100-LFC', quantity: 4 }),
    ];

    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket({ id: 22, productionId: 8 }),
      crewName: 'Cuadrilla Audio FOH',
      crewId: 'crew-foh-02',
      directive: 'Calibrar sistema principal.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'En ejecución',
      reservations,
    });

    expect(html).toContain('3 ítems · 13 unidades');
    expect(html).toContain('Total reservado:</strong> 3 ítems (13 unidades)');
    expect(html).toContain('Consola Digital DiGiCo Quantum 338');
    expect(html).toContain('Arreglo Lineal Meyer Sound LYON-M');
    expect(html).toContain('Subwoofer Meyer Sound 1100-LFC');
    expect(html).toContain('8 unidades');
    expect(html).toContain('4 unidades');
  });

  it('3. renders ALL reservations when there are more than 8 items without truncation and keeps flexible pagination CSS', () => {
    const reservations = Array.from({ length: 12 }, (_, idx) =>
      makeReservation(idx + 1, {
        equipmentName: `Equipamiento Escénico Ítem ${idx + 1}`,
        quantity: 2,
      }),
    );

    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket({ id: 30, productionId: 19 }),
      crewName: 'Cuadrilla Escenario Principal',
      crewId: 'crew-stage-19',
      directive: 'Montaje completo de escenario.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'En montaje',
      reservations,
    });

    expect(html).toContain('12 ítems · 24 unidades');
    for (let i = 1; i <= 12; i++) {
      expect(html).toContain(`Equipamiento Escénico Ítem ${i}`);
      expect(html).toContain(`EQ-${String(i).padStart(3, '0')}`);
    }
    expect(html).not.toContain('partida(s) técnica(s) adicional(es)');
    // Flexible multi-page pagination rules
    expect(html).toContain('display: table-header-group;');
    expect(html).toContain('counter(page)');
    expect(html).toContain('counter(pages)');
  });

  it('4. renders clean neutral empty state when a production has zero reservations', () => {
    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket({ id: 12, productionId: 9 }),
      crewName: 'Cuadrilla Soporte',
      crewId: 'crew-sup-09',
      directive: 'Revisión de sala.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'En montaje',
      reservations: [],
    });

    expect(html).toContain('Sin reservas');
    expect(html).toContain('Sin reservas de equipamiento registradas para la Producción #9.');
    expect(html).toContain('Total reservado:</strong> Sin reservas registradas');
  });

  it('6. handles unresolved organizer without exposing raw UUID or claiming Entra ID resolution', () => {
    const rawCanonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:7d300514-1e39-4013-85e5-02efa3fd42df';

    const htmlUnresolved = buildCrewTicketPrintHtml({
      ticket: makeTicket(),
      crewName: 'Cuadrilla A',
      crewId: 'crew-a',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      reservations: [],
      organizerId: rawCanonicalId,
      organizerDisplayName: null,
      organizerResolutionSource: 'UNRESOLVED',
    });

    expect(htmlUnresolved).toContain('<strong>No disponible</strong>');
    expect(htmlUnresolved).toContain('ID interno protegido (registro de producción)');
    expect(htmlUnresolved).not.toContain('directorio Entra ID');
    expect(htmlUnresolved).not.toContain(rawCanonicalId);

    // Must not use legacy hardcoded KNOWN_ORGANIZERS registry either
    const htmlKnownKey = buildCrewTicketPrintHtml({
      ticket: makeTicket(),
      crewName: 'Cuadrilla A',
      crewId: 'crew-a',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      reservations: [],
      organizerId: 'org-innovacion-biobio',
      organizerDisplayName: null,
      organizerResolutionSource: null,
    });
    expect(htmlKnownKey).not.toContain('76.842.190-5');
    expect(htmlKnownKey).not.toContain('Corporación de Innovación y Desarrollo del Biobío');
  });

  it('7. handles unidentified crew neutrally and preserves historical vs current crew separation when they differ', () => {
    const htmlNoCrew = buildCrewTicketPrintHtml({
      ticket: makeTicket(),
      crewName: null,
      crewId: null,
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      reservations: [],
    });

    expect(htmlNoCrew).toContain('<h2 class="card-heading">Sin registro</h2>');
    expect(htmlNoCrew).toContain('No disponible');
    expect(htmlNoCrew).not.toContain('Cuadrilla Técnica Alfa');
    expect(htmlNoCrew).not.toContain('crew-alfa-stgo');

    const htmlDifferentCrew = buildCrewTicketPrintHtml({
      ticket: makeTicket(),
      crewName: 'Cuadrilla Inicial Norte',
      crewId: 'crew-norte-01',
      currentCrewName: 'Cuadrilla Reasignada Sur',
      currentCrewId: 'crew-sur-02',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'En ejecución',
      reservations: [],
    });

    expect(htmlDifferentCrew).toContain('Cuadrilla Inicial Norte');
    expect(htmlDifferentCrew).toContain('crew-norte-01');
    expect(htmlDifferentCrew).toContain('Cuadrilla vigente en producción: <strong>Cuadrilla Reasignada Sur</strong> (crew-sur-02).');
  });

  it('8. differentiates historical ticket status from current production status with query timestamp and early-closure note', () => {
    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket({
        status: 'EN_MONTAJE',
        scheduledAt: '2026-11-25T09:00:00',
        createdAt: '2026-11-23T02:03:24.116572',
      }),
      crewName: 'Cuadrilla Biobío',
      crewId: 'crew-bb-01',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'Cerrado',
      productionStatusCode: 'CERRADO',
      productionUpdatedAt: '2026-11-23T02:10:23.702322',
      productionQueriedAt: '2026-11-23T18:30:00Z',
      reservations: [],
    });

    expect(html).toContain('Estado al Emitir Ticket');
    expect(html).toContain('EN MONTAJE');
    expect(html).toContain('Estado Actual Producción');
    expect(html).toContain('CERRADO');
    expect(html).toContain('Consultado: 23/11/2026 · 15:30 h CLST');
    expect(html).toContain('producción cerrada antes de la fecha programada');
  });

  it('10. normalizes Notify naive LocalDateTime as UTC without +3h drift and formats Chile summer/winter offsets accurately', () => {
    // Summer in Chile (November = CLST, UTC-3)
    const parsedUtc = parseServerTimestampAsUtc('2026-11-23T02:03:24.116572');
    expect(parsedUtc?.toISOString()).toBe('2026-11-23T02:03:24.116Z');
    expect(formatServerTimestampUtc('2026-11-23T02:03:24.116572')).toBe('2026-11-23 02:03:24 UTC');
    expect(formatServerTimestampChile('2026-11-23T02:03:24.116572').full).toBe(
      '22/11/2026, 23:03 h (CLST, UTC-3)',
    );

    // Winter in Chile (July = CLT, UTC-4)
    expect(formatServerTimestampChile('2026-07-15T14:30:00').full).toBe(
      '15/07/2026, 10:30 h (CLT, UTC-4)',
    );

    // Naive wall-clock scheduledAt preserves local Chilean time without shifting
    const naiveEvent = formatChileEventDateTime('2026-11-25T09:00:00');
    expect(naiveEvent.full).toBe('25/11/2026, 09:00 h (CLST, UTC-3)');
    expect(naiveEvent.kpiMain).toBe('25/11/2026 · 09:00 h');

    // Offset-aware scheduledAt converts accurately into America/Santiago
    const utcEvent = formatChileEventDateTime('2026-07-15T18:00:00Z');
    expect(utcEvent.full).toBe('15/07/2026, 14:00 h (CLT, UTC-4)');
  });

  it('generates a technically valid ISO/IEC 18004 QR matrix with 4-module quiet zone and exact traceability payload', () => {
    const ticket = makeTicket();
    const payload = buildCrewTicketQrPayload(ticket, 'crew-sur-av-01');
    expect(payload).toBe(
      'EMX|OT-0007|PRD-15|EVT:4c8f11b2-3e91-4d80-a772-9102f6c1a234|CREW:crew-sur-av-01|2026-11-23T02:03:24Z',
    );
    expect(buildCrewTicketQrPayload(ticket, null)).toContain('|CREW:SIN_ID|');

    const qr = encodeQrMatrix(payload);
    expect(qr.version).toBeGreaterThanOrEqual(4);
    expect(qr.size).toBe(qr.version * 4 + 17);
    // Top-left finder pattern outer border & center 3x3 dark square
    expect(qr.matrix[0][0]).toBe(1);
    expect(qr.matrix[0][6]).toBe(1);
    expect(qr.matrix[3][3]).toBe(1);
    expect(qr.matrix[1][1]).toBe(0);
    // Dark module fixed by ISO/IEC 18004 at (4*version + 9, 8)
    expect(qr.matrix[4 * qr.version + 9][8]).toBe(1);

    // ISO/IEC 18004 standard 4-module quiet zone -> viewBox = size + 8
    const svg = buildInternalTraceabilityQrSvg(payload, 58, '#031c43');
    const expectedVb = qr.size + 8;
    expect(svg).toContain(`width="58" height="58"`);
    expect(svg).toContain(`viewBox="0 0 ${expectedVb} ${expectedVb}"`);
  });

  it('H-M3. escapes malicious HTML/XSS payloads across all dynamic fields', () => {
    const xssScript = `<script>alert("xss")</script>`;
    const xssImg = `<img src=x onerror="alert('img')">`;
    const xssAttr = `" onmouseover="alert(1)`;

    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket({
        productionName: `Evento ${xssScript}`,
        location: `Salón ${xssImg}`,
        eventId: `evt-${xssAttr}`,
      }),
      crewName: `Cuadrilla ${xssScript}`,
      crewId: `crew-${xssAttr}`,
      currentCrewName: `Vigente ${xssImg}`,
      currentCrewId: `curr-${xssAttr}`,
      directive: `Revisar ${xssScript} y ${xssImg}`,
      statusLabel: `En montaje ${xssImg}`,
      productionStatusLabel: `Cerrado ${xssScript}`,
      organizerId: `org-${xssAttr}`,
      organizerDisplayName: `Nombre ${xssScript}`,
      organizerResolutionSource: 'ENTRA_GRAPH',
      reservations: [
        makeReservation(1, {
          equipmentName: `Consola ${xssImg}`,
          status: `RESERVED${xssScript}`,
        }),
      ],
    });

    expect(html).not.toContain('<script>alert(');
    expect(html).not.toContain('<img src=x onerror=');
    expect(html).not.toContain('" onmouseover="alert(1)');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(&#39;img&#39;)&quot;&gt;');
  });

  it('H-M2. cancels pending requestAnimationFrame and preserves document.title when print frame is removed before firing', () => {
    const originalTitle = document.title;
    let capturedCb: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      capturedCb = cb;
      return 777;
    });
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const printData: CrewTicketPrintData = {
      ticket: makeTicket(),
      crewName: 'Cuadrilla Norte',
      crewId: 'crew-n-01',
      directive: 'Montaje estándar.',
      statusLabel: 'En montaje',
      reservations: [],
    };

    try {
      triggerCrewTicketPrint(printData);
      expect(rafSpy).toHaveBeenCalledTimes(1);
      expect(document.querySelector('iframe[data-print-frame="crew-ticket"]')).not.toBeNull();

      // Remove before rAF runs -> cancels scheduled frame and never mutates document.title
      removeExistingCrewTicketPrintFrame();
      expect(cafSpy).toHaveBeenCalledWith(777);
      expect(document.title).toBe(originalTitle);
      expect(document.querySelector('iframe[data-print-frame="crew-ticket"]')).toBeNull();

      // Even if a stale rAF callback fires after the iframe is detached, guard ignores it safely
      if (capturedCb) {
        (capturedCb as FrameRequestCallback)(performance.now());
      }
      expect(document.title).toBe(originalTitle);
    } finally {
      removeExistingCrewTicketPrintFrame();
      rafSpy.mockRestore();
      cafSpy.mockRestore();
      document.title = originalTitle;
    }
  });

  it('OBS-03. preserves complete C v2 content, >= 8pt operational text, 54px internal QR and dynamic pagination for OT-0009 (5 reservations / 10 units)', () => {
    const reservations: EquipmentReservationItem[] = [
      makeReservation(1, { reservationId: 11, equipmentName: 'Sistema de Audio Line Array Profesional 2x12"', quantity: 2 }),
      makeReservation(2, { reservationId: 12, equipmentName: 'Consola Digital de Mezcla 32 Canales FOH', quantity: 1 }),
      makeReservation(3, { reservationId: 13, equipmentName: 'Kit de Iluminación LED Moving Head Beam RGBW', quantity: 4 }),
      makeReservation(4, { reservationId: 14, equipmentName: 'Pantalla LED Modular Pitch 2.9mm 4x2.5m', quantity: 1 }),
      makeReservation(5, { reservationId: 15, equipmentName: 'Micrófono Inalámbrico Doble Canal UHF Pro', quantity: 2 }),
    ];

    const html = buildCrewTicketPrintHtml({
      ticket: makeTicket({
        id: 9,
        productionId: 13,
        productionName: 'Cumbre Nacional de Innovación Cloud Native & Arquitectura 2026!!', // 64 chars
        location: 'Centro de Convenciones Parque Bicentenario, Salón Sur', // 53 chars
        status: 'EN_MONTAJE',
        scheduledAt: '2026-11-30T19:00:00',
        createdAt: '2026-11-23T22:25:00.000000',
      }),
      crewName: 'Cuadrilla Técnica Audiovisual Región',
      crewId: 'crew-audiovis-013',
      directive: 'Ejecutar montaje integral de audio, iluminación y pantalla LED.',
      statusLabel: 'En montaje',
      productionStatusLabel: 'Cerrado',
      productionStatusCode: 'CERRADO',
      productionUpdatedAt: '2026-11-23T22:30:26',
      productionQueriedAt: '2026-11-23T23:00:00Z',
      organizerDisplayName: 'Organizador Corporativo Verificado',
      organizerResolutionSource: 'ENTRA_GRAPH',
      reservations,
    });

    expect(html).toContain('OT-0009 · Producción #13');
    expect(html).toContain('5 ítems · 10 unidades');
    expect(html).toContain('Total reservado:</strong> 5 ítems (10 unidades)');
    expect(html).toContain('producción cerrada antes de la fecha programada');
    expect(html).toContain('width="54" height="54"');
    expect(html).toContain('font-size: 8.4pt;');
    expect(html).toContain('margin: 6mm 10mm 8.5mm 10mm;');
    expect(html).toContain('display: table-header-group;');
    expect(html).toContain('break-inside: avoid;');
    expect(html).toContain('Entrega / Despacho Bodega');
    expect(html).toContain('Responsable de Cuadrilla');
    expect(html).toContain('Recepción en Terreno / Producción');
  });
});
