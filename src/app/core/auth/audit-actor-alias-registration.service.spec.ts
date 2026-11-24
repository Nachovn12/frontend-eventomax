import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  AUDIT_ACTOR_ALIAS_REGISTRATION_ENABLED,
  AuditActorAliasRegistrationService,
} from './audit-actor-alias-registration.service';
import { AuthorizationService } from './authorization.service';
import { AppRole } from './models/app-role';
import { environment } from '../../../environments/environment';
import { environment as localEnvironment } from '../../../environments/environment.local';
import { environment as prodEnvironment } from '../../../environments/environment.prod';

describe('AuditActorAliasRegistrationService', () => {
  const endpoint = `${environment.apiGatewayUrl}/api/audit/actor-aliases/me`;

  function setup(options: {
    enabled?: boolean;
    roles?: readonly AppRole[];
    hasScope?: boolean;
    ownerId?: string;
  } = {}) {
    const authzStub = {
      roles: () => options.roles ?? [AppRole.Productor],
      hasScope: (scope: string) => scope === 'access_as_user' && (options.hasScope ?? true),
      ownerId: () => options.ownerId ?? 'f191bdc8-7926-4722-9ec0-cba663701940:c3057bf6-9e39-4fa4-b042-d3932d49ebc0',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuditActorAliasRegistrationService,
        { provide: AuthorizationService, useValue: authzStub },
        ...(options.enabled !== undefined
          ? [{ provide: AUDIT_ACTOR_ALIAS_REGISTRATION_ENABLED, useValue: options.enabled }]
          : []),
      ],
    });

    return {
      service: TestBed.inject(AuditActorAliasRegistrationService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('is disabled by default in environment configuration and issues zero requests to AWS', async () => {
    expect(environment.enableAuditActorAliasRegistration).toBe(false);
    expect(localEnvironment.enableAuditActorAliasRegistration).toBe(false);
    const { service, httpMock } = setup();

    await service.registerIfEligible();

    httpMock.expectNone(endpoint);
  });

  it('enables automatic alias registration exclusively in production environment and uses null body with HTTP 204 for all 4 roles', async () => {
    expect(prodEnvironment.enableAuditActorAliasRegistration).toBe(true);
    expect(environment.enableAuditActorAliasRegistration).toBe(false);
    expect(localEnvironment.enableAuditActorAliasRegistration).toBe(false);

    for (const role of [AppRole.Admin, AppRole.Productor, AppRole.Organizador, AppRole.Auditor]) {
      TestBed.resetTestingModule();
      const { service, httpMock } = setup({
        enabled: prodEnvironment.enableAuditActorAliasRegistration,
        roles: [role],
      });

      const promise = service.registerIfEligible();
      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush(null, { status: 204, statusText: 'No Content' });

      await expect(promise).resolves.toBeUndefined();

      // Idempotent within same session: second call issues zero extra HTTP requests
      await service.registerIfEligible();
      httpMock.expectNone(endpoint);
    }
  });

  it('never leaks ownerId, JWT or PII in console warnings when backend rejects alias registration', async () => {
    const sensitiveOwnerId = 'f191bdc8-7926-4722-9ec0-cba663701940:c3057bf6-9e39-4fa4-b042-d3932d49ebc0';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { service, httpMock } = setup({
        enabled: prodEnvironment.enableAuditActorAliasRegistration,
        roles: [AppRole.Productor],
        ownerId: sensitiveOwnerId,
      });

      const promise = service.registerIfEligible();
      const req = httpMock.expectOne(endpoint);
      req.flush({ error: 'conflict' }, { status: 409, statusText: 'Conflict' });
      await expect(promise).resolves.toBeUndefined();

      const loggedText = warnSpy.mock.calls.flat().map(String).join(' ');
      expect(loggedText).not.toContain(sensitiveOwnerId);
      expect(loggedText).not.toContain('c3057bf6');
      expect(loggedText).not.toContain('Bearer');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('sends POST with null body for Productor and Organizador when explicitly enabled and deduplicates per session', async () => {
    for (const role of [AppRole.Productor, AppRole.Organizador]) {
      TestBed.resetTestingModule();
      const { service, httpMock } = setup({ enabled: true, roles: [role] });

      const first = service.registerIfEligible();
      const concurrent = service.registerIfEligible();

      const req = httpMock.expectOne(endpoint);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(null, { status: 204, statusText: 'No Content' });

      await Promise.all([first, concurrent]);

      // Subsequent call in same session is deduplicated
      await service.registerIfEligible();
      httpMock.expectNone(endpoint);
    }
  });

  it('skips registration when token/scope/roles/ownerId are unavailable', async () => {
    const cases = [
      { enabled: true, roles: [] as AppRole[], hasScope: true, ownerId: 'tid:oid' },
      { enabled: true, roles: [AppRole.Productor], hasScope: false, ownerId: 'tid:oid' },
      { enabled: true, roles: [AppRole.Productor], hasScope: true, ownerId: '' },
    ];

    for (const c of cases) {
      TestBed.resetTestingModule();
      const { service, httpMock } = setup(c);
      await service.registerIfEligible();
      httpMock.expectNone(endpoint);
    }
  });

  it('does not block login or retry infinitely on 400, 401, 403, or 409 errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const status of [400, 401, 403, 409]) {
        TestBed.resetTestingModule();
        const { service, httpMock } = setup({ enabled: true, roles: [AppRole.Admin] });

        const promise = service.registerIfEligible();
        const req = httpMock.expectOne(endpoint);
        expect(req.request.body).toBeNull();
        req.flush({ error: 'rejected' }, { status, statusText: 'Error' });

        await expect(promise).resolves.toBeUndefined();

        // Must NOT retry in same session after non-retryable status
        await service.registerIfEligible();
        httpMock.expectNone(endpoint);
      }
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('handles transient 503 failure without blocking login and allows later attempt after recovery', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { service, httpMock } = setup({ enabled: true, roles: [AppRole.Auditor] });

      const first = service.registerIfEligible();
      const req1 = httpMock.expectOne(endpoint);
      req1.flush({ error: 'unavailable' }, { status: 503, statusText: 'Service Unavailable' });
      await expect(first).resolves.toBeUndefined();

      // After transient error, a later explicit call can succeed
      const second = service.registerIfEligible();
      const req2 = httpMock.expectOne(endpoint);
      expect(req2.request.body).toBeNull();
      req2.flush(null, { status: 204, statusText: 'No Content' });
      await expect(second).resolves.toBeUndefined();

      // Once succeeded, reset() clears deduplication
      service.reset();
      const third = service.registerIfEligible();
      const req3 = httpMock.expectOne(endpoint);
      req3.flush(null, { status: 204, statusText: 'No Content' });
      await expect(third).resolves.toBeUndefined();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
