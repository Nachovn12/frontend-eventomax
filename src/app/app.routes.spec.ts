import { MsalGuard } from '@azure/msal-angular';
import { routes } from './app.routes';
import { roleGuard } from './core/auth/guards/role.guard';
import { featureGuard } from './core/auth/guards/feature.guard';
import { AppRole } from './core/auth/models/app-role';

describe('Protected workspace routes', () => {
  const children = routes.find((route) => route.children)?.children;
  it.each([
    ['dashboard', [AppRole.Admin, AppRole.Productor, AppRole.Organizador, AppRole.Auditor]],
    ['productions', [AppRole.Admin, AppRole.Productor, AppRole.Organizador]],
    ['catalog', [AppRole.Admin, AppRole.Productor]],
    ['reports', [AppRole.Admin]],
    ['audit', [AppRole.Admin, AppRole.Auditor]],
  ])('preserves MSAL, role guard and the exact roles on /%s', (path, roles) => {
    const route = children?.find((item) => item.path === path);
    expect(route?.canActivate).toEqual([MsalGuard, roleGuard, featureGuard]);
    expect(route?.data?.['roles']).toEqual(roles);
  });
});
