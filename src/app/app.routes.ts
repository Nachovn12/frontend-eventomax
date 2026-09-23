import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { roleGuard } from './core/auth/guards/role.guard';
import { featureGuard } from './core/auth/guards/feature.guard';
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
        canActivate: [MsalGuard, roleGuard, featureGuard],
        data: {
          feature: 'dashboard',
          roles: [
            AppRole.Admin,
            AppRole.Productor,
            AppRole.Organizador,
            AppRole.Auditor,
          ]
        }
      },
      {
        path: 'productions',
        loadComponent: () => import('./features/productions/productions').then(m => m.Productions),
        canActivate: [MsalGuard, roleGuard, featureGuard],
        data: {
          feature: 'productions',
          roles: [
            AppRole.Admin,
            AppRole.Productor,
            AppRole.Organizador,
          ]
        }
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/catalog').then(m => m.Catalog),
        canActivate: [MsalGuard, roleGuard, featureGuard],
        data: {
          feature: 'catalog',
          roles: [
            AppRole.Admin,
            AppRole.Productor,
          ]
        }
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then(m => m.Reports),
        canActivate: [MsalGuard, roleGuard, featureGuard],
        data: {
          feature: 'reports',
          roles: [AppRole.Admin]
        }
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit').then(m => m.Audit),
        canActivate: [MsalGuard, roleGuard, featureGuard],
        data: {
          feature: 'audit',
          roles: [
            AppRole.Admin,
            AppRole.Auditor
          ]
        }
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/not-found/not-found').then(m => m.NotFound)
  },
];
