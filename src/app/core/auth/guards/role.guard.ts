import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthorizationService } from '../authorization.service';
import { AppRole } from '../models/app-role';

export const roleGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const authz = inject(AuthorizationService);
  const forbiddenUrl = router.createUrlTree(['/forbidden']);

  const requiredRoles = route.data['roles'] as AppRole[] | undefined;

  if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) {
    return forbiddenUrl;
  }

  try {
    await authz.refreshAuthorization();
  } catch {
    return forbiddenUrl;
  }

  const hasAccess = authz.hasAnyRole(requiredRoles);

  return hasAccess ? true : forbiddenUrl;
};
