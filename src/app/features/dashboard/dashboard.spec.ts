import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  const roles = signal<AppRole[]>([]);
  beforeEach(async () => {
    roles.set([]);
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), { provide: AuthorizationService, useValue: { roles } }],
    }).compileComponents();
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });
  it.each([
    [AppRole.Admin, ['/productions', '/catalog', '/reports']],
    [AppRole.Producer, ['/productions', '/catalog']],
    [AppRole.Organizer, ['/productions']],
    [AppRole.Auditor, ['/audit']],
  ])('only provides permitted quick actions to %s', (role, expected) => {
    roles.set([role]);
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.quick-action'),
    ).map((link) => link.getAttribute('href'));
    expect(links).toEqual(expected);
  });
  it('labels the examples and hides inventory from Organizer and Auditor', () => {
    for (const role of [AppRole.Organizer, AppRole.Auditor]) {
      roles.set([role]);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;

      expect(text).not.toContain('Inventario y reservas');
    }
  });
  it('does not imply that demo records belong to the signed-in Organizer', () => {
    roles.set([AppRole.Organizer]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no representa eventos de tu cuenta');
  });
  it('does not expose actions with no recognized roles', () => {
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
  });
});
