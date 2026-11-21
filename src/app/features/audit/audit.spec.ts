import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Audit } from './audit';
import { AuditDataService } from './audit-data.service';
import { AuditEvent } from './models/audit-event.model';

describe('Audit EP2 (EMX-109/110)', () => {
  const sample: AuditEvent = {
    eventId: 'd762a6e9-a286-4822-8f95-819170d30d2f',
    actor: 'usuario-demo',
    type: 'ProductionCreated',
    timestamp: '2026-10-14T19:00:00',
    details: '{"productionId":4}',
    traceId: 'emx-audit-trace-1',
    correlationId: null,
    source: 'ms-eventomax-productions'
  };

  async function setup(allowed = true, rows: readonly AuditEvent[] = [sample]) {
    const roles = signal<AppRole[]>([AppRole.Auditor]);
    const api = { getTimeline: vi.fn(() => of(rows)) };
    await TestBed.configureTestingModule({
      imports: [Audit],
      providers: [
        { provide: AuditDataService, useValue: api },
        { provide: AuthorizationService, useValue: {
          roles, hasAnyRole: () => allowed, hasScope: () => allowed
        } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Audit);
    fixture.detectChanges();
    await fixture.whenStable();
    return { api, fixture, component: fixture.componentInstance };
  }

  it('loads actual timeline and prints escaped JSON string, source and trace metadata', async () => {
    const { fixture, api } = await setup();
    expect(api.getTimeline).toHaveBeenCalledWith({ page: 0, size: 25 });
    expect(fixture.nativeElement.textContent).toContain('ProductionCreated');
    expect(fixture.nativeElement.textContent).toContain('emx-audit-trace-1');
    expect(fixture.nativeElement.textContent).toContain('ms-eventomax-productions');
    expect(fixture.nativeElement.querySelectorAll('.audit-event')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Identidad activa: Auditor');
  });

  it('does not query Audit without appropriate role and scope', async () => {
    const { fixture, api } = await setup(false);
    expect(api.getTimeline).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Acceso restringido');
  });

  it('applies filters with browser-local datetime converted into UTC', async () => {
    const { component, api } = await setup();
    component.filtersForm.patchValue({
      actor: ' usuario-demo ', type: 'ProductionStatusChanged',
      from: '2026-10-01T10:00', to: '2026-10-15T18:30'
    });
    component.applyFilters();
    expect(api.getTimeline).toHaveBeenLastCalledWith({
      actor: 'usuario-demo',
      type: 'ProductionStatusChanged',
      from: new Date('2026-10-01T10:00').toISOString().slice(0, 19),
      to: new Date('2026-10-15T18:30').toISOString().slice(0, 19),
      page: 0, size: 25
    });
  });

  it('blocks invalid date intervals without sending another query', async () => {
    const { component, api } = await setup();
    const calls = api.getTimeline.mock.calls.length;
    component.filtersForm.patchValue({
      from: '2026-10-15T18:30',
      to: '2026-10-01T10:00'
    });
    component.applyFilters();
    expect(api.getTimeline).toHaveBeenCalledTimes(calls);
    expect(component.filterError()).toContain('Revisa el intervalo');
  });

  it('supports paging without inventing a total-page count', async () => {
    const rows = Array.from({ length: 25 }, (_, id): AuditEvent => ({
      ...sample, eventId: 'event-' + id
    }));
    const { component, api } = await setup(true, rows);
    expect(component.canAdvance()).toBe(true);
    component.nextPage();
    expect(api.getTimeline).toHaveBeenLastCalledWith({ page: 1, size: 25 });
    component.previousPage();
    expect(api.getTimeline).toHaveBeenLastCalledWith({ page: 0, size: 25 });
  });

  it('shows network failures and allows retry without inventing timeline data', async () => {
    const { api, component, fixture } = await setup();
    api.getTimeline.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 502 })));
    component.retry();
    fixture.detectChanges();
    expect(component.items()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Audit no está disponible');
  });

  it('interprets LocalDateTime timestamps as UTC', async () => {
    const { component } = await setup();
    expect(component.timestampUtc('2026-10-14T19:00:00')).toBe('2026-10-14T19:00:00Z');
  });

  it('polls audit timeline automatically every 30s without losing active filters', async () => {
    vi.useFakeTimers();
    try {
      const { api, component, fixture } = await setup();
      component.filtersForm.patchValue({ actor: 'usuario-demo' });
      component.applyFilters();
      expect(api.getTimeline).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(30_000);
      fixture.detectChanges();

      expect(api.getTimeline).toHaveBeenCalledTimes(3);
      expect(api.getTimeline).toHaveBeenLastCalledWith({ actor: 'usuario-demo', page: 0, size: 25 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('displays actorDisplayName with correct initial and moves technical actor ID into expandable details', async () => {
    const canonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:c3057bf6-9e39-4fa4-b042-d3932d49ebc0';
    const namedEvent: AuditEvent = {
      ...sample,
      eventId: 'evt-named-1',
      actor: canonicalId,
      actorDisplayName: 'Ignacio Valeria Núñez',
    };
    const { fixture } = await setup(true, [namedEvent]);
    const badge = fixture.nativeElement.querySelector('.actor-badge');
    const avatar = fixture.nativeElement.querySelector('.actor-avatar');
    const techValue = fixture.nativeElement.querySelector('.audit-actor-tech-value');

    expect(badge.textContent).toContain('Actor: Ignacio Valeria Núñez');
    expect(badge.textContent).not.toContain(canonicalId);
    expect(avatar.textContent.trim()).toBe('I');
    expect(techValue.textContent.trim()).toBe(canonicalId);
  });

  it('handles system, historical tid:oid, opaque sub, and readable legacy actors prudently', async () => {
    const canonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:c3057bf6-9e39-4fa4-b042-d3932d49ebc0';
    const opaqueSub = 'sqdd0RRocgoh8Vpb8bmF2B7ad03kqIPhbn_Fs07K9ds';
    const rows: AuditEvent[] = [
      { ...sample, eventId: 'e-sys', actor: 'system', actorDisplayName: null },
      { ...sample, eventId: 'e-tid', actor: canonicalId, actorDisplayName: null },
      { ...sample, eventId: 'e-sub', actor: opaqueSub, actorDisplayName: undefined },
      { ...sample, eventId: 'e-leg', actor: 'usuario-demo', actorDisplayName: null },
    ];
    const { fixture } = await setup(true, rows);
    const badges = Array.from(fixture.nativeElement.querySelectorAll('.actor-badge')) as HTMLElement[];
    const avatars = Array.from(fixture.nativeElement.querySelectorAll('.actor-avatar')) as HTMLElement[];
    const techValues = Array.from(fixture.nativeElement.querySelectorAll('.audit-actor-tech-value')) as HTMLElement[];

    expect(badges[0].textContent).toContain('Actor: Sistema');
    expect(avatars[0].textContent?.trim()).toBe('S');
    expect(techValues[0].textContent?.trim()).toBe('system');

    expect(badges[1].textContent).toContain('Actor: Usuario autenticado');
    expect(badges[1].textContent).not.toContain(canonicalId);
    expect(avatars[1].textContent?.trim()).toBe('U');
    expect(techValues[1].textContent?.trim()).toBe(canonicalId);

    expect(badges[2].textContent).toContain('Actor: Usuario autenticado');
    expect(badges[2].textContent).not.toContain(opaqueSub);
    expect(avatars[2].textContent?.trim()).toBe('U');
    expect(techValues[2].textContent?.trim()).toBe(opaqueSub);

    expect(badges[3].textContent).toContain('Actor: usuario-demo');
    expect(avatars[3].textContent?.trim()).toBe('U');
    expect(techValues[3].textContent?.trim()).toBe('usuario-demo');
  });

  it('copies original technical actor ID via button and keeps accordion available when details is empty', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const canonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:c3057bf6-9e39-4fa4-b042-d3932d49ebc0';
    const emptyDetailsEvent: AuditEvent = {
      ...sample,
      eventId: 'evt-empty-details',
      actor: canonicalId,
      actorDisplayName: 'Ignacio Valeria Núñez',
      details: '',
    };

    const { fixture } = await setup(true, [emptyDetailsEvent]);
    const accordion = fixture.nativeElement.querySelector('.audit-details-accordion');
    const copyActorBtn = fixture.nativeElement.querySelector('.btn-copy-actor-id') as HTMLButtonElement;
    const copyJsonBtn = fixture.nativeElement.querySelector('.btn-copy-json');

    expect(accordion).not.toBeNull();
    expect(copyJsonBtn).toBeNull();
    expect(copyActorBtn.textContent).toContain('Copiar ID');

    copyActorBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(canonicalId);
    expect(copyActorBtn.textContent).toContain('¡Copiado!');
  });

  it('counts unique actors by technical actor identity rather than display name', async () => {
    const rows: AuditEvent[] = [
      { ...sample, eventId: 'e1', actor: 'tenant:oid-1', actorDisplayName: 'María López' },
      { ...sample, eventId: 'e2', actor: 'tenant:oid-2', actorDisplayName: 'María López' },
      { ...sample, eventId: 'e3', actor: 'tenant:oid-1', actorDisplayName: 'María López' },
    ];
    const { component } = await setup(true, rows);
    expect(component.uniqueActorsCount()).toBe(2);
  });

  it('renders optional deliverable actorEmail and human-readable actorResolutionSource labels while discarding #EXT# emails', async () => {
    const rows: AuditEvent[] = [
      {
        ...sample,
        eventId: 'e-event',
        actor: 'f191bdc8-7926-4722-9ec0-cba663701940:c3057bf6-9e39-4fa4-b042-d3932d49ebc0',
        actorDisplayName: 'Ignacio Valeria Núñez',
        actorEmail: null,
        actorResolutionSource: 'EVENT',
      },
      {
        ...sample,
        eventId: 'e-dir',
        actor: 'f191bdc8-7926-4722-9ec0-cba663701940:e5660fea-1111-4444-8888-111111111111',
        actorDisplayName: 'Benjamín Espinoza',
        actorEmail: 'benja.espinoza@duocuc.cl',
        actorResolutionSource: 'ENTRA_DIRECTORY',
      },
      {
        ...sample,
        eventId: 'e-sub-verified',
        actor: 'sqdd0RRocgoh8Vpb8bmF2B7ad03kqIPhbn_Fs07K9ds',
        actorDisplayName: 'Ignacio Valeria Núñez',
        actorEmail: 'ig_duoc#EXT#@tenant.onmicrosoft.com',
        actorResolutionSource: 'VERIFIED_SUB_TO_ENTRA_DIRECTORY',
      },
      {
        ...sample,
        eventId: 'e-unresolved',
        actor: 'opaqueUnresolvedSub99887766554433221100AA',
        actorDisplayName: null,
        actorEmail: null,
        actorResolutionSource: 'UNRESOLVED',
      },
    ];

    const { fixture } = await setup(true, rows);
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.audit-event')) as HTMLElement[];

    // 1. EVENT
    expect(cards[0].querySelector('.actor-name')?.textContent).toContain('Ignacio Valeria Núñez');
    expect(cards[0].querySelector('.actor-email')).toBeNull();
    expect(cards[0].querySelector('.audit-actor-source-value')?.textContent?.trim())
      .toBe('Nombre registrado en el evento');

    // 2. ENTRA_DIRECTORY with valid deliverable email
    expect(cards[1].querySelector('.actor-name')?.textContent).toContain('Benjamín Espinoza');
    expect(cards[1].querySelector('.actor-email')?.textContent?.trim()).toBe('benja.espinoza@duocuc.cl');
    expect(cards[1].querySelector('.audit-actor-source-value')?.textContent?.trim())
      .toBe('Directorio Microsoft Entra ID (datos actuales)');

    // 3. VERIFIED_SUB_TO_ENTRA_DIRECTORY discards #EXT# email and keeps original sub in technical details
    expect(cards[2].querySelector('.actor-name')?.textContent).toContain('Ignacio Valeria Núñez');
    expect(cards[2].querySelector('.actor-email')).toBeNull();
    expect(cards[2].querySelector('.audit-actor-tech-value')?.textContent?.trim())
      .toBe('sqdd0RRocgoh8Vpb8bmF2B7ad03kqIPhbn_Fs07K9ds');
    expect(cards[2].querySelector('.audit-actor-source-value')?.textContent?.trim())
      .toBe('Identidad histórica vinculada mediante asociación verificada');

    // 4. UNRESOLVED
    expect(cards[3].querySelector('.actor-name')?.textContent).toContain('Usuario autenticado');
    expect(cards[3].querySelector('.audit-actor-source-value')?.textContent?.trim())
      .toBe('Identidad no resuelta');
  });
});
