import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Landing } from './landing';

describe('Landing Component (Storylane Real Platform UX Walkthrough)', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('renders correctly with editorial hero heading and platform eyebrow', () => {
    const heading = fixture.nativeElement.querySelector('h1#hero-title');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toContain('Producción de eventos sin imprevistos');
    expect(heading.textContent).toContain('De la planificación al montaje final');
    expect(heading.querySelector('emx-word-roll')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('emx-marker-text').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('PLATAFORMA PARA PRODUCCIÓN Y MONTAJE DE EVENTOS');
  });

  it('renders the interactive walkthrough with 4 segmented pill tabs', () => {
    const pills = fixture.nativeElement.querySelectorAll('.segmented-pill');
    expect(pills.length).toBe(4);
    expect(pills[0].textContent).toContain('Panel Principal');
    expect(pills[1].textContent).toContain('Gestión de Producciones');
    expect(pills[2].textContent).toContain('Hoja de Ruta Cuadrilla');
    expect(pills[3].textContent).toContain('Historial y Auditoría');
  });

  it('initializes with Step 0 (Real Dashboard & Kafka) displaying real screen image and beacons', () => {
    expect(component.activeTab()).toBe(0);
    expect(component.displayMode()).toBe('interactive');

    const img = fixture.nativeElement.querySelector('.storylane-screen-image');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/branding/eventomax/demo/demo-real-1-dashboard.png');

    const beacons = fixture.nativeElement.querySelectorAll('.beacon-trigger');
    expect(beacons.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Flujo de Eventos en Tiempo Real');
  });

  it('switches to Step 1 (Real Productions) and updates real screen and hotspots', () => {
    component.setTab(1);
    fixture.detectChanges();

    expect(component.activeTab()).toBe(1);
    const img = fixture.nativeElement.querySelector('.storylane-screen-image');
    expect(img.getAttribute('src')).toBe('/branding/eventomax/demo/demo-real-2-productions.png');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Bloqueo Atómico de Inventario AV');
    expect(text).toContain('Control de Transición a EN_MONTAJE');
  });

  it('switches to Step 2 (Real Crew Ticket Modal) and displays RabbitMQ dispatch info', () => {
    component.setTab(2);
    fixture.detectChanges();

    expect(component.activeTab()).toBe(2);
    const img = fixture.nativeElement.querySelector('.storylane-screen-image');
    expect(img.getAttribute('src')).toBe('/branding/eventomax/demo/demo-real-3-crewticket.png');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Despacho Asíncrono de Cuadrilla');
    expect(text).toContain('q.cmd.crew');
    expect(text).toContain('ACK 100%');
  });

  it('switches to Step 3 (Real Audit Timeline) and displays Kafka event consumer details', () => {
    component.setTab(3);
    fixture.detectChanges();

    expect(component.activeTab()).toBe(3);
    const img = fixture.nativeElement.querySelector('.storylane-screen-image');
    expect(img.getAttribute('src')).toBe('/branding/eventomax/demo/demo-real-4-audit.png');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Evento ProductionStatusChanged Auditado');
    expect(text).toContain('ignacio.valeria@eventomax.cl');
    expect(text).toContain('tr-c4b9-8f2e-71a0');
  });

  it('toggles between interactive mode and video mode seamlessly', () => {
    expect(component.displayMode()).toBe('interactive');

    component.setMode('video');
    fixture.detectChanges();
    expect(component.displayMode()).toBe('video');

    const videoEl = fixture.nativeElement.querySelector('video.native-demo-video');
    expect(videoEl).toBeTruthy();
    expect(videoEl.getAttribute('src')).toBe('/branding/eventomax/demo/eventomax-real-demo.webm');

    component.setMode('interactive');
    fixture.detectChanges();
    expect(component.displayMode()).toBe('interactive');
    expect(fixture.nativeElement.querySelector('.storylane-screen-image')).toBeTruthy();
  });

  it('toggles hotspots visibility and selects a specific hotspot', () => {
    expect(component.showHotspots()).toBe(true);
    component.toggleHotspots();
    fixture.detectChanges();
    expect(component.showHotspots()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.storylane-hotspot').length).toBe(0);

    component.toggleHotspots();
    fixture.detectChanges();
    expect(component.showHotspots()).toBe(true);

    expect(component.activeHotspot()).toBeNull();
    component.selectHotspot('k1');
    expect(component.activeHotspot()).toBe('k1');
    component.selectHotspot('k1');
    expect(component.activeHotspot()).toBeNull();
  });

  it('navigates next and previous steps via dock controls', () => {
    expect(component.activeTab()).toBe(0);
    component.nextTab();
    expect(component.activeTab()).toBe(1);
    component.nextTab();
    expect(component.activeTab()).toBe(2);
    component.prevTab();
    expect(component.activeTab()).toBe(1);
  });

  it('toggles playback pause and play', () => {
    expect(component.isPlaying()).toBe(true);
    component.togglePlay();
    expect(component.isPlaying()).toBe(false);
    component.togglePlay();
    expect(component.isPlaying()).toBe(true);
  });

  it('renders the 4 operational impact metric cards', () => {
    const cards = fixture.nativeElement.querySelectorAll('.metric-card');
    expect(cards.length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Cero Sobre-Arriendos Imprevistos');
    expect(fixture.nativeElement.textContent).toContain('Ahorro Promedio en Montaje');
    expect(fixture.nativeElement.textContent).toContain('Trazabilidad en Tiempo Real');
    expect(fixture.nativeElement.textContent).toContain('Red Colaborativa Unificada');
  });

  it('renders the Cloud Native architecture pillars', () => {
    const archCards = fixture.nativeElement.querySelectorAll('.arch-card');
    expect(archCards.length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Microsoft Entra ID');
    expect(fixture.nativeElement.textContent).toContain('RabbitMQ 4.3 Async Dispatch');
    expect(fixture.nativeElement.textContent).toContain('Apache Kafka 7.8 Cluster');
    expect(fixture.nativeElement.textContent).toContain('Spring Boot 4.1 + Angular 22');
  });

  it('scrolls smoothly to section and prevents default routing to login', () => {
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as Event;

    const existingSection = fixture.nativeElement.querySelector('#simulador') as HTMLElement;
    expect(existingSection).toBeTruthy();
    existingSection.scrollIntoView = vi.fn();

    component.scrollToSection('simulador', mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(existingSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('renders the enterprise footer with 5 columns and handles section navigation', () => {
    const footerEl = fixture.nativeElement.querySelector('emx-footer-enterprise') as HTMLElement;
    expect(footerEl).toBeTruthy();

    const columnTitles = Array.from(footerEl.querySelectorAll('.fe-col-title')).map((el) =>
      el.textContent?.trim()
    );
    expect(columnTitles.length).toBe(5);

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as Event;

    const existingSection = fixture.nativeElement.querySelector('#simulador') as HTMLElement;
    existingSection.scrollIntoView = vi.fn();

    component.onFooterSectionNavigate({ sectionId: 'simulador', tabIndex: 2, event: mockEvent });
    expect(component.activeTab()).toBe(2);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(existingSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('uses quiet Safari address bar chrome without AI status pill and supports view refresh', () => {
    const chrome = fixture.nativeElement.querySelector('.window-address-pill') as HTMLElement;
    expect(chrome).toBeTruthy();
    expect(chrome.textContent).not.toContain('Plataforma Real Activa');
    expect(chrome.querySelector('.window-status-indicator')).toBeNull();

    const refreshBtn = chrome.querySelector('.window-refresh-btn') as HTMLButtonElement;
    expect(refreshBtn).toBeTruthy();

    component.selectHotspot('k1');
    expect(component.activeHotspot()).toBe('k1');
    refreshBtn.click();
    fixture.detectChanges();
    expect(component.activeHotspot()).toBeNull();
  });

  it('shows Scroll-to-Top button after scrolling and returns to top cleanly', () => {
    const scrollBtn = fixture.nativeElement.querySelector('.scroll-to-top-btn') as HTMLButtonElement;
    expect(scrollBtn).toBeTruthy();
    expect(component.showScrollTop()).toBe(false);
    expect(scrollBtn.classList.contains('visible')).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 620, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.showScrollTop()).toBe(true);
    expect(scrollBtn.classList.contains('visible')).toBe(true);
    expect(scrollBtn.getAttribute('tabindex')).toBe('0');

    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollBtn.click();
    expect(scrollToSpy).toHaveBeenCalled();
    scrollToSpy.mockRestore();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
});
