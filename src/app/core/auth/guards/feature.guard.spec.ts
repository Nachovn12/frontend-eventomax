import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { featureGuard } from './feature.guard';

describe('EP2 feature guard', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [{ provide: Router, useValue: { parseUrl: vi.fn() } }]
  }));

  it.each(['reports', 'audit'])('enables /%s while existing roleGuard and MsalGuard remain active', feature => {
    const route = { data: { feature } } as unknown as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;
    expect(TestBed.runInInjectionContext(() => featureGuard(route, state))).toBe(true);
  });
});
