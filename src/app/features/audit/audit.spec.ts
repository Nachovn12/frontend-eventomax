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
    correlationId: null
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

  it('loads actual timeline and prints escaped JSON string and trace metadata', async () => {
    const { fixture, api } = await setup();
    expect(api.getTimeline).toHaveBeenCalledWith({ page: 0, size: 25 });
    expect(fixture.nativeElement.textContent).toContain('ProductionCreated');
    expect(fixture.nativeElement.textContent).toContain('emx-audit-trace-1');
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
});
