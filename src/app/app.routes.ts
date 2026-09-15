import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { roleGuard } from './core/auth/guards/role.guard';
import { AppRole } from './core/auth/models/app-role';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/auth/forbidden/forbidden').then(m => m.Forbidden)
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell').then(m => m.AppShell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [MsalGuard, roleGuard],
        data: {
          roles: [
            AppRole.Admin,
            AppRole.Producer,
            AppRole.Organizer,
            AppRole.Auditor,
          ]
        }
      },
      {
        path: 'productions',
        loadComponent: () => import('./features/productions/productions').then(m => m.Productions),
        canActivate: [MsalGuard, roleGuard],
        data: {
          roles: [
            AppRole.Admin,
            AppRole.Producer,
            AppRole.Organizer,
          ]
        }
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/catalog').then(m => m.Catalog),
        canActivate: [MsalGuard, roleGuard],
        data: {
          roles: [
            AppRole.Admin,
            AppRole.Producer,
          ]
        }
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then(m => m.Reports),
        canActivate: [MsalGuard, roleGuard],
        data: {
          roles: [AppRole.Admin]
        }
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit').then(m => m.Audit),
        canActivate: [MsalGuard, roleGuard],
        data: {
          roles: [AppRole.Auditor]
        }
      }
    ]
  },
  { path: '**', redirectTo: 'login' },
];
