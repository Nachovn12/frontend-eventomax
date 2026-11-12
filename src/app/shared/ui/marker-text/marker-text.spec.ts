import { Component, signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkDirective, MarkerTextComponent } from './marker-text.component';

@Component({
  standalone: true,
  imports: [MarkerTextComponent, MarkDirective],
  template: `
    <h2>
      <emx-marker-text [show]="show()" (drawn)="onDrawn()">
        Lo que ganan con <span emxMark="underline">EventoMax</span> y
        <mark emxMark="highlight">estándar profesional</mark>
      </emx-marker-text>
    </h2>
  `,
})
class TestHostComponent {
  readonly show = signal<boolean>(false);
  drawnCount = 0;
  onDrawn(): void {
    this.drawnCount += 1;
  }
}

describe('MarkerTextComponent (Kokonut UI SVG Ink Port)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('preserves semantic text and renders underline & highlight mark directives', () => {
    const heading = fixture.nativeElement.querySelector('h2') as HTMLElement;
    expect(heading.textContent).toContain('Lo que ganan con EventoMax y estándar profesional');

    const underline = heading.querySelector('[data-mark="underline"]');
    const highlight = heading.querySelector('[data-mark="highlight"]');
    expect(underline).toBeTruthy();
    expect(highlight).toBeTruthy();
    expect(highlight?.tagName.toLowerCase()).toBe('mark');
  });

  it('builds SVG stroke overlays when geometry is measured and arms transition when show becomes true', () => {
    const underline = fixture.nativeElement.querySelector('[data-mark="underline"]') as HTMLElement;
    const highlight = fixture.nativeElement.querySelector('[data-mark="highlight"]') as HTMLElement;

    vi.spyOn(underline, 'getBoundingClientRect').mockReturnValue({
      left: 120,
      top: 10,
      right: 240,
      bottom: 42,
      width: 120,
      height: 32,
      x: 120,
      y: 10,
      toJSON: () => ({}),
    });
    vi.spyOn(highlight, 'getBoundingClientRect').mockReturnValue({
      left: 260,
      top: 10,
      right: 430,
      bottom: 42,
      width: 170,
      height: 32,
      x: 260,
      y: 10,
      toJSON: () => ({}),
    });

    vi.runAllTimers();
    fixture.detectChanges();

    const underPaths = fixture.nativeElement.querySelectorAll('.emx-marker-under path');
    const overPaths = fixture.nativeElement.querySelectorAll('.emx-marker-over path');
    expect(underPaths.length).toBeGreaterThan(0);
    expect(overPaths.length).toBeGreaterThan(0);

    host.show.set(true);
    fixture.detectChanges();
    vi.runAllTimers();
    fixture.detectChanges();
    vi.runAllTimers();
    fixture.detectChanges();

    const markerCmp = fixture.debugElement.children[0].children[0].componentInstance as MarkerTextComponent;
    expect(markerCmp.armed()).toBe(true);
    expect(host.drawnCount).toBeGreaterThanOrEqual(1);
  });
});
