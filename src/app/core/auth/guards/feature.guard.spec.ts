import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { featureGuard } from './feature.guard';

describe('EP2 feature guard', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [{ provide: Router, useValue: { parseUrl: vi.fn() } }]
  }));

  it.each(['dashboard', 'productions', 'catalog', 'reports', 'audit', 'organizers'])(
    'enables /%s while existing roleGuard and MsalGuard remain active',
    (feature) => {
      const route = { data: { feature } } as unknown as ActivatedRouteSnapshot;
      const state = {} as RouterStateSnapshot;
      expect(TestBed.runInInjectionContext(() => featureGuard(route, state))).toBe(true);
    }
  );

  it('fails closed and redirects to /dashboard for unknown or missing feature flags', () => {
    const router = TestBed.inject(Router);
    const parseUrlSpy = router.parseUrl as ReturnType<typeof vi.fn>;
    const dashboardTree = {} as any;
    parseUrlSpy.mockReturnValue(dashboardTree);

    const unknownRoute = { data: { feature: 'nonexistent-module' } } as unknown as ActivatedRouteSnapshot;
    const missingRoute = { data: {} } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    expect(TestBed.runInInjectionContext(() => featureGuard(unknownRoute, state))).toBe(dashboardTree);
    expect(TestBed.runInInjectionContext(() => featureGuard(missingRoute, state))).toBe(dashboardTree);
    expect(parseUrlSpy).toHaveBeenCalledWith('/dashboard');
  });
});
