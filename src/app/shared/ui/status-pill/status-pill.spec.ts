import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { StatusPill, Tag, StatusTone, StatusSize, StatusGlyph } from './status-pill';

@Component({
  standalone: true,
  imports: [StatusPill, Tag],
  template: `
    <emx-status-pill [tone]="tone()" [size]="size()" [glyph]="glyph()">
      {{ text() }}
    </emx-status-pill>
    <emx-tag [tone]="tagTone()" [interactive]="interactive()">{{ tagText() }}</emx-tag>
  `,
})
class TestHostComponent {
  readonly tone = signal<StatusTone>('neutral');
  readonly size = signal<StatusSize>('md');
  readonly glyph = signal<StatusGlyph | null>(null);
  readonly text = signal('Estado');
  readonly tagText = signal('#PRD-001');
  readonly tagTone = signal<StatusTone>('neutral');
  readonly interactive = signal(false);
}

describe('StatusPill & Tag (TuffUI Design System)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders default neutral md pill with projected text', () => {
    const pill = fixture.nativeElement.querySelector('.emx-status-pill');
    expect(pill).not.toBeNull();
    expect(pill.classList.contains('tone-neutral')).toBe(true);
    expect(pill.classList.contains('size-md')).toBe(true);
    expect(pill.textContent.trim()).toBe('Estado');
  });

  it('applies calibrated semantic tones correctly', () => {
    const tones: StatusTone[] = ['brand', 'positive', 'negative', 'warning', 'neutral'];
    for (const t of tones) {
      component.tone.set(t);
      fixture.detectChanges();
      const pill = fixture.nativeElement.querySelector('.emx-status-pill');
      expect(pill.classList.contains(`tone-${t}`)).toBe(true);
    }
  });

  it('supports compact size sm (20px) and standard size md (24px)', () => {
    component.size.set('sm');
    fixture.detectChanges();
    const pill = fixture.nativeElement.querySelector('.emx-status-pill');
    expect(pill.classList.contains('size-sm')).toBe(true);

    component.size.set('md');
    fixture.detectChanges();
    expect(pill.classList.contains('size-md')).toBe(true);
  });

  it('renders cutout glyphs with SVG masks and dots', () => {
    component.glyph.set('check');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill-glyph')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('mask')).not.toBeNull();

    component.glyph.set('pulse');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill-pulse-dot')).not.toBeNull();

    component.glyph.set('cross');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill-glyph')).not.toBeNull();

    component.glyph.set('warning');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill-glyph')).not.toBeNull();

    component.glyph.set('clock');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pill-glyph')).not.toBeNull();
  });

  it('renders Tag with monospace styling and supports interactive mode', () => {
    const tag = fixture.nativeElement.querySelector('.emx-tag');
    expect(tag).not.toBeNull();
    expect(tag.textContent.trim()).toBe('#PRD-001');
    expect(tag.classList.contains('is-interactive')).toBe(false);

    component.interactive.set(true);
    fixture.detectChanges();
    expect(tag.classList.contains('is-interactive')).toBe(true);
  });

  it('supports semantic tone variants on Tag', () => {
    component.tagTone.set('positive');
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('.emx-tag');
    expect(tag.classList.contains('tone-positive')).toBe(true);

    component.tagTone.set('brand');
    fixture.detectChanges();
    expect(tag.classList.contains('tone-brand')).toBe(true);
  });
});
