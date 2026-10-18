import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from './authorization.service';
import { AuthService } from './auth.service';
import { AppRole } from './models/app-role';
import { environment } from '../../../environments/environment';

// Helper to create a dummy JWT for tests
function createDummyJwt(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signature = 'dummies';
  return `${header}.${p}.${signature}`;
}

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let authMock: any;
  const validAud = 'a1a87bcd-fed7-4d65-83c3-338389b80093';

  beforeEach(() => {
    authMock = {
      acquireAccessToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthorizationService,
        { provide: AuthService, useValue: authMock },
      ]
    });
    service = TestBed.inject(AuthorizationService);
  });

  const getValidPayload = () => ({
    aud: validAud,
    iss: environment.expectedIssuer,
    exp: Math.floor(Date.now() / 1000) + 3600,
    roles: ['Admin'],
    scp: 'access_as_user'
  });

  it('should fail closed when no active account / acquireTokenSilent fails', async () => {
    authMock.acquireAccessToken.mockRejectedValue(new Error('No active account'));
    await service.refreshAuthorization();
    expect(service.roles()).toEqual([]);
    expect(service.scopes()).toEqual([]);
    expect(service.hasRole(AppRole.Admin)).toBe(false);
  });

  it('should parse valid Access Token with Admin role and scope correctly', async () => {
    const payload = getValidPayload();
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([AppRole.Admin]);
    expect(service.scopes()).toEqual(['access_as_user']);
    expect(service.hasRole(AppRole.Admin)).toBe(true);
    expect(service.hasScope('access_as_user')).toBe(true);
  });

  it('should return true for hasAnyRole when multiple roles are present', async () => {
    const payload = getValidPayload();
    payload.roles = ['Admin', 'Productor'];
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.hasRole(AppRole.Productor)).toBe(true);
    expect(service.hasAnyRole([AppRole.Admin, AppRole.Auditor])).toBe(true);
  });

  it('should ignore unknown roles (including legacy Producer/Organizer)', async () => {
    const payload = getValidPayload();
    payload.roles = ['Admin', 'Hacker', 'Unknown', 'Producer', 'Organizer'];
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([AppRole.Admin]);
    expect(service.hasRole(AppRole.Admin)).toBe(true);
  });

  it('should properly split multiple scopes', async () => {
    const payload = getValidPayload();
    payload.scp = 'access_as_user custom_scope';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.scopes()).toEqual(['access_as_user', 'custom_scope']);
    expect(service.hasScope('custom_scope')).toBe(true);
  });

  it('should accept authorized Application ID URI audience (api://GUID)', async () => {
    const payload = getValidPayload();
    payload.aud = `api://${validAud}`;
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([AppRole.Admin]);
    expect(service.scopes()).toEqual(['access_as_user']);
  });

  it('should accept aud claim as a valid string array containing an authorized audience', async () => {
    const payload: any = getValidPayload();
    payload.aud = ['other-resource', `api://${validAud}`];
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([AppRole.Admin]);
    expect(service.scopes()).toEqual(['access_as_user']);
  });

  it('should fail closed if audience is incorrect', async () => {
    const payload = getValidPayload();
    payload.aud = 'wrong-audience';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([]);
    expect(service.scopes()).toEqual([]);
  });

  it('should fail closed if audience is empty string, empty array, or contains non-string elements', async () => {
    for (const invalidAud of ['', '   ', [], undefined, null, [validAud, 123]]) {
      const payload: any = getValidPayload();
      payload.aud = invalidAud;
      authMock.acquireAccessToken.mockResolvedValue({
        accessToken: createDummyJwt(payload)
      });
      await service.refreshAuthorization();

      expect(service.roles()).toEqual([]);
      expect(service.scopes()).toEqual([]);
    }
  });

  it('should fail closed if issuer is incorrect', async () => {
    const payload = getValidPayload();
    payload.iss = 'https://login.microsoftonline.com/other-tenant/v2.0';

    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });

    await service.refreshAuthorization();

    expect(service.roles()).toEqual([]);
    expect(service.scopes()).toEqual([]);
  });

  it('should fail closed if token is expired', async () => {
    const payload = getValidPayload();
    payload.exp = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([]);
  });

  it('should fail closed if JWT is malformed', async () => {
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: 'not.a.valid.jwt'
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([]);
    expect(service.scopes()).toEqual([]);
  });

  it('should fail closed if roles claim has an invalid type', async () => {
    const payload: any = getValidPayload();
    payload.roles = 'NotAnArray';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([]);
  });

  it('should fail closed if scp claim has an invalid type', async () => {
    const payload: any = getValidPayload();
    payload.scp = ['NotAString'];
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.scopes()).toEqual([]);
  });

  it('should resolve empty roles and scopes when roles and scp claims are absent', async () => {
    const payload: any = getValidPayload();
    delete payload.roles;
    delete payload.scp;
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.roles()).toEqual([]);
    expect(service.scopes()).toEqual([]);
    expect(service.hasRole(AppRole.Admin)).toBe(false);
    expect(service.hasScope('access_as_user')).toBe(false);
  });

  it('should resolve canonical tid:oid ownerId when both are present', async () => {
    const payload: any = getValidPayload();
    payload.tid = 'tenant-duoc-ep2';
    payload.oid = 'user-oid-123';
    payload.sub = 'user-sub-456';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.ownerId()).toBe('tenant-duoc-ep2:user-oid-123');
  });

  it('should fallback to oid when tid is absent', async () => {
    const payload: any = getValidPayload();
    payload.oid = 'user-oid-123';
    payload.sub = 'user-sub-456';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.ownerId()).toBe('user-oid-123');
  });

  it('should fallback to sub when oid and tid are absent', async () => {
    const payload: any = getValidPayload();
    payload.sub = 'user-sub-456';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();

    expect(service.ownerId()).toBe('user-sub-456');
  });

  it('should clear ownerId on clear()', async () => {
    const payload: any = getValidPayload();
    payload.oid = 'user-oid-123';
    authMock.acquireAccessToken.mockResolvedValue({
      accessToken: createDummyJwt(payload)
    });
    await service.refreshAuthorization();
    expect(service.ownerId()).toBe('user-oid-123');

    service.clear();
    expect(service.ownerId()).toBe('');
  });
});
