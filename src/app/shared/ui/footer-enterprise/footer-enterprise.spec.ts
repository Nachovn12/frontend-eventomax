import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FooterEnterpriseComponent } from './footer-enterprise.component';

describe('FooterEnterpriseComponent (Ruixen UI 3-Tier Enterprise Footer)', () => {
  let component: FooterEnterpriseComponent;
  let fixture: ComponentFixture<FooterEnterpriseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterEnterpriseComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterEnterpriseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders brand lockup, description, and utility/social icons in top tier', () => {
    const brandName = fixture.nativeElement.querySelector('.fe-brand-name');
    const description = fixture.nativeElement.querySelector('.fe-description');
    const socials = fixture.nativeElement.querySelectorAll('.fe-social-link');

    expect(brandName.textContent.trim()).toBe('EventoMax');
    expect(description.textContent).toContain('Plataforma unificada para producción técnica');
    expect(socials.length).toBe(3);
  });

  it('renders 5-column wide navigation grid with all EventoMax domains', () => {
    const columns = fixture.nativeElement.querySelectorAll('.fe-col');
    expect(columns.length).toBe(5);

    const titles = Array.from(columns).map((c) =>
      (c as HTMLElement).querySelector('.fe-col-title')?.textContent?.trim()
    );
    expect(titles).toEqual([
      'Plataforma',
      'Operaciones',
      'Observabilidad',
      'Seguridad & IDaaS',
      'Ingeniería',
    ]);
  });

  it('renders external GitHub repository link with secure rel attributes', () => {
    const extLink = fixture.nativeElement.querySelector('a.fe-link-external') as HTMLAnchorElement;
    expect(extLink).toBeTruthy();
    expect(extLink.getAttribute('href')).toBe('https://github.com/Nachovn12/frontend-eventomax');
    expect(extLink.getAttribute('target')).toBe('_blank');
    expect(extLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders bottom copyright and compliance links', () => {
    const copyright = fixture.nativeElement.querySelector('.fe-copyright');
    const bottomLinks = fixture.nativeElement.querySelectorAll('.fe-bottom-link');

    expect(copyright.textContent).toContain('© 2026 EventoMax');
    expect(bottomLinks.length).toBe(4);
    expect(bottomLinks[0].textContent.trim()).toBe('ISO/IEC 27001');
  });

  it('emits sectionNavigate on section anchor clicks without navigating away', () => {
    const spy = vi.fn();
    component.sectionNavigate.subscribe(spy);

    const firstAnchor = fixture.nativeElement.querySelector('.fe-grid a[href="#simulador"]') as HTMLAnchorElement;
    expect(firstAnchor).toBeTruthy();

    firstAnchor.click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].sectionId).toBe('simulador');
  });
});
