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

  it('applies filters with Chile (America/Santiago) datetime converted into UTC independently of device TZ', async () => {
    const { component, api } = await setup();
    // October in Chile = CLST (UTC-3)
    component.filtersForm.patchValue({
      actor: ' usuario-demo ', type: 'ProductionStatusChanged',
      from: '2026-10-01T10:00', to: '2026-10-15T18:30'
    });
    component.applyFilters();
    expect(api.getTimeline).toHaveBeenLastCalledWith({
      actor: 'usuario-demo',
      type: 'ProductionStatusChanged',
      from: '2026-10-01T13:00:00',
      to: '2026-10-15T21:30:00',
      page: 0, size: 25
    });

    // July in Chile = CLT (UTC-4)
    component.filtersForm.patchValue({
      from: '2026-07-15T10:00', to: '2026-07-15T23:59:59'
    });
    component.applyFilters();
    expect(api.getTimeline).toHaveBeenLastCalledWith({
      actor: 'usuario-demo',
      type: 'ProductionStatusChanged',
      from: '2026-07-15T14:00:00',
      to: '2026-07-16T03:59:59',
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

  it('renders Chile summer (CLST, UTC-3) and winter (CLT, UTC-4) timestamps without fake UTC labels and preserves UTC tooltip/detail', async () => {
    const rows: AuditEvent[] = [
      { ...sample, eventId: 'evt-prod-13-summer', timestamp: '2026-11-23T22:30:26' },
      { ...sample, eventId: 'evt-winter-clt', timestamp: '2026-07-15T22:30:26Z' },
    ];
    const { fixture } = await setup(true, rows);
    const timeCols = Array.from(fixture.nativeElement.querySelectorAll('.audit-time-col')) as HTMLElement[];
    const dateBadges = Array.from(fixture.nativeElement.querySelectorAll('.audit-date-badge')) as HTMLElement[];
    const timeTexts = Array.from(fixture.nativeElement.querySelectorAll('.audit-time-text')) as HTMLElement[];
    const utcValues = Array.from(fixture.nativeElement.querySelectorAll('.audit-utc-tech-value')) as HTMLElement[];

    // Summer (Production #13 case): 2026-11-23T22:30:26Z -> 23/11/2026 · 19:30:26 CLST (UTC-3)
    expect(dateBadges[0].textContent?.trim()).toBe('23/11/2026');
    expect(timeTexts[0].textContent?.trim()).toBe('19:30:26 CLST (UTC-3)');
    expect(timeTexts[0].textContent?.trim()).not.toBe('19:30:26 UTC');
    expect(timeCols[0].getAttribute('title')).toContain('2026-11-23T22:30:26Z');
    expect(utcValues[0].textContent?.trim()).toBe('2026-11-23T22:30:26Z');

    // Winter: 2026-07-15T22:30:26Z -> 15/07/2026 · 18:30:26 CLT (UTC-4)
    expect(dateBadges[1].textContent?.trim()).toBe('15/07/2026');
    expect(timeTexts[1].textContent?.trim()).toBe('18:30:26 CLT (UTC-4)');
    expect(timeCols[1].getAttribute('title')).toContain('2026-07-15T22:30:26Z');
    expect(utcValues[1].textContent?.trim()).toBe('2026-07-15T22:30:26Z');
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

  it('OBS-04: renders 14 audit events with WAI-ARIA Disclosure sibling buttons and zero interactive controls nested in <summary>', async () => {
    const fourteenRows: AuditEvent[] = Array.from({ length: 14 }, (_, idx) => ({
      ...sample,
      eventId: `evt-a11y-${String(idx + 1).padStart(2, '0')}`,
      details: JSON.stringify({ productionId: 13, seq: idx + 1 }),
    }));
    const { fixture } = await setup(true, fourteenRows);
    const root: HTMLElement = fixture.nativeElement;

    // Zero <summary> elements and zero nested interactive controls
    expect(root.querySelectorAll('summary')).toHaveLength(0);
    expect(root.querySelectorAll('summary button, button button')).toHaveLength(0);

    const toggleButtons = Array.from(root.querySelectorAll('button.audit-details-summary')) as HTMLButtonElement[];
    const copyButtons = Array.from(root.querySelectorAll('button.btn-copy-json')) as HTMLButtonElement[];
    const panels = Array.from(root.querySelectorAll('.audit-details-content')) as HTMLElement[];

    expect(toggleButtons).toHaveLength(14);
    expect(copyButtons).toHaveLength(14);
    expect(panels).toHaveLength(14);

    // Every toggle button has unique aria-controls pointing to a matching hidden panel and is sibling (not ancestor) of copy button
    const panelIds = new Set<string>();
    toggleButtons.forEach((btn, idx) => {
      const controlsId = btn.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
      panelIds.add(controlsId!);
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.contains(copyButtons[idx])).toBe(false);
      expect(panels[idx].id).toBe(controlsId);
      expect(panels[idx].hidden).toBe(true);
    });
    expect(panelIds.size).toBe(14);
  });

  it('OBS-04: toggles disclosure via button click without Copy JSON involuntarily opening or closing the panel', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { fixture } = await setup(true, [sample]);
    const root: HTMLElement = fixture.nativeElement;
    const accordion = root.querySelector('.audit-details-accordion') as HTMLElement;
    const toggleBtn = root.querySelector('button.audit-details-summary') as HTMLButtonElement;
    const copyJsonBtn = root.querySelector('button.btn-copy-json') as HTMLButtonElement;
    const panel = root.querySelector('.audit-details-content') as HTMLElement;

    // 1. Click "Copiar JSON" while collapsed -> copies payload, shows "¡Copiado!", keeps panel collapsed
    copyJsonBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(sample.details);
    expect(copyJsonBtn.textContent).toContain('¡Copiado!');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(accordion.classList.contains('is-open')).toBe(false);

    // 2. Click toggle button -> expands panel and rotates chevron via .is-open
    toggleBtn.click();
    fixture.detectChanges();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    expect(accordion.classList.contains('is-open')).toBe(true);

    // 3. Click "Copiar JSON" while expanded -> keeps panel open
    copyJsonBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);

    // 4. Click toggle button again -> collapses panel cleanly
    toggleBtn.click();
    fixture.detectChanges();

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(accordion.classList.contains('is-open')).toBe(false);
  });

  it('OBS-04: prunes stale expanded event IDs on refresh and resets expansion on filter/pagination', async () => {
    const pageOneRows: AuditEvent[] = Array.from({ length: 25 }, (_, idx) => ({
      ...sample,
      eventId: `evt-p1-${idx}`,
    }));
    const { api, component, fixture } = await setup(true, pageOneRows);

    // Open two events on page 1
    component.toggleDetails('evt-p1-0');
    component.toggleDetails('evt-p1-1');
    expect(component.expandedEventIds().size).toBe(2);

    // Refresh where evt-p1-1 rolled off the list -> evt-p1-0 stays open, evt-p1-1 is pruned (no stale accumulation)
    api.getTimeline.mockReturnValue(of([pageOneRows[0], { ...sample, eventId: 'evt-new-99' }]));
    component.retry();
    fixture.detectChanges();
    expect(component.isDetailsExpanded('evt-p1-0')).toBe(true);
    expect(component.isDetailsExpanded('evt-p1-1')).toBe(false);
    expect(component.expandedEventIds().size).toBe(1);

    // Filtering resets expanded state cleanly
    api.getTimeline.mockReturnValue(of(pageOneRows));
    component.filtersForm.patchValue({ actor: 'usuario-demo' });
    component.applyFilters();
    fixture.detectChanges();
    expect(component.expandedEventIds().size).toBe(0);

    // Pagination resets expanded state cleanly
    component.toggleDetails('evt-p1-0');
    expect(component.expandedEventIds().size).toBe(1);
    component.nextPage();
    fixture.detectChanges();
    expect(component.expandedEventIds().size).toBe(0);

    component.toggleDetails('evt-p1-0');
    component.previousPage();
    fixture.detectChanges();
    expect(component.expandedEventIds().size).toBe(0);

    component.toggleDetails('evt-p1-0');
    component.clearFilters();
    fixture.detectChanges();
    expect(component.expandedEventIds().size).toBe(0);
  });
});
