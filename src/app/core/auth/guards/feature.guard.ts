import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const features: Readonly<Record<string, boolean>> = {
  dashboard: true,
  productions: true,
  catalog: true,
  reports: true,
  audit: true,
  organizers: true,
};

export const featureGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const featureName = route.data?.['feature'];

  if (
    typeof featureName !== 'string' ||
    !Object.prototype.hasOwnProperty.call(features, featureName) ||
    features[featureName] !== true
  ) {
    return router.parseUrl('/dashboard');
  }

  return true;
};
