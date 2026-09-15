import { MsalGuard } from '@azure/msal-angular';
import { routes } from './app.routes';
import { roleGuard } from './core/auth/guards/role.guard';
import { AppRole } from './core/auth/models/app-role';

describe('Protected workspace routes', () => {
  const children = routes.find((route) => route.children)?.children;
  it.each([
    ['dashboard', [AppRole.Admin, AppRole.Producer, AppRole.Organizer, AppRole.Auditor]],
    ['productions', [AppRole.Admin, AppRole.Producer, AppRole.Organizer]],
    ['catalog', [AppRole.Admin, AppRole.Producer]],
    ['reports', [AppRole.Admin]],
    ['audit', [AppRole.Auditor]],
  ])('preserves MSAL, role guard and the exact roles on /%s', (path, roles) => {
    const route = children?.find((item) => item.path === path);
    expect(route?.canActivate).toEqual([MsalGuard, roleGuard]);
    expect(route?.data?.['roles']).toEqual(roles);
  });
});
