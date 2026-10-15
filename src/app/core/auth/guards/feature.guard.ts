import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const features = {
  dashboard: true,
  productions: true,
  catalog: true,
  reports: true,
  audit: true
};

export const featureGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const featureName = route.data?.['feature'] as keyof typeof features;

  if (featureName && features[featureName] === false) {
    return router.parseUrl('/dashboard');
  }

  return true;
};
