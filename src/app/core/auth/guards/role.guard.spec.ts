import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthorizationService } from '../authorization.service';
import { AppRole } from '../models/app-role';

describe('roleGuard', () => {
  let authzMock: any;
  let routerMock: any;

  beforeEach(() => {
    authzMock = {
      hasAnyRole: vi.fn(),
      refreshAuthorization: vi.fn().mockResolvedValue(undefined),
    };

    routerMock = {
      createUrlTree: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthorizationService, useValue: authzMock },
        { provide: Router, useValue: routerMock },
      ]
    });
  });

  const runGuard = async (rolesData: any) => {
    const route = { data: { roles: rolesData } } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    return await TestBed.runInInjectionContext(() => roleGuard(route, state) as Promise<boolean | UrlTree>);
  };

  it('should fail closed (/forbidden) and NOT call refreshAuthorization if route.data.roles is absent', async () => {
    const mockUrlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(mockUrlTree);

    const result = await runGuard(undefined);

    expect(authzMock.refreshAuthorization).not.toHaveBeenCalled();
    expect(authzMock.hasAnyRole).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toBe(mockUrlTree);
  });

  it('should fail closed (/forbidden) and NOT call refreshAuthorization if route.data.roles is empty', async () => {
    const mockUrlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(mockUrlTree);

    const result = await runGuard([]);

    expect(authzMock.refreshAuthorization).not.toHaveBeenCalled();
    expect(authzMock.hasAnyRole).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toBe(mockUrlTree);
  });

  it('should fail closed (/forbidden) and NOT call refreshAuthorization if route.data.roles has invalid type', async () => {
    const mockUrlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(mockUrlTree);

    const result = await runGuard('NotAnArray');

    expect(authzMock.refreshAuthorization).not.toHaveBeenCalled();
    expect(authzMock.hasAnyRole).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toBe(mockUrlTree);
  });

  it('should refresh authorization and allow access if user has required role (Admin)', async () => {
    authzMock.hasAnyRole.mockReturnValue(true);

    const result = await runGuard([AppRole.Admin]);

    expect(authzMock.refreshAuthorization).toHaveBeenCalled();
    expect(authzMock.hasAnyRole).toHaveBeenCalledWith([AppRole.Admin]);
    expect(result).toBe(true);
  });

  it('should refresh authorization and allow access if user has at least one of the roles (Producer or Organizer)', async () => {
    authzMock.hasAnyRole.mockReturnValue(true);

    const result = await runGuard([AppRole.Producer, AppRole.Organizer]);

    expect(authzMock.refreshAuthorization).toHaveBeenCalled();
    expect(authzMock.hasAnyRole).toHaveBeenCalledWith([AppRole.Producer, AppRole.Organizer]);
    expect(result).toBe(true);
  });

  it('should refresh authorization and return /forbidden UrlTree if user lacks required roles', async () => {
    authzMock.hasAnyRole.mockReturnValue(false);
    const mockUrlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(mockUrlTree);

    const result = await runGuard([AppRole.Admin]);

    expect(authzMock.refreshAuthorization).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toBe(mockUrlTree);
  });

  it('should fail closed (/forbidden) if refreshAuthorization throws an error', async () => {
    authzMock.refreshAuthorization.mockRejectedValue(new Error('Network error'));
    const mockUrlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(mockUrlTree);

    const result = await runGuard([AppRole.Admin]);

    expect(authzMock.refreshAuthorization).toHaveBeenCalled();
    expect(authzMock.hasAnyRole).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toBe(mockUrlTree);
  });
});
