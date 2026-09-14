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
    path: 'audit',
    loadComponent: () => import('./features/audit/audit').then(m => m.Audit),
    canActivate: [MsalGuard, roleGuard],
    data: {
      roles: [AppRole.Auditor]
    }
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
