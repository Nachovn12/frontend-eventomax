import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WordRollComponent } from './word-roll.component';

describe('WordRollComponent (DesignBookmark Spring Physics)', () => {
  let component: WordRollComponent;
  let fixture: ComponentFixture<WordRollComponent>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  it('renders lead copy, initial word characters, and full accessible label', async () => {
    await TestBed.configureTestingModule({
      imports: [WordRollComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WordRollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.emx-roll') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('aria-label')).toBe('De la planificación al montaje final.');

    const lead = root.querySelector('.emx-roll-lead') as HTMLElement;
    expect(lead.textContent?.trim()).toBe('De la planificación al');

    const chars = Array.from(root.querySelectorAll('.emx-roll-ch')).map((c) => c.textContent);
    expect(chars.join('')).toBe('montaje final.');
  });

  it('advances to the next word on click and Enter/Space keydown', async () => {
    await TestBed.configureTestingModule({
      imports: [WordRollComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WordRollComponent);
    component = fixture.componentInstance;
    const emitted: string[] = [];
    component.wordChange.subscribe((w) => emitted.push(w));
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.emx-roll') as HTMLElement;
    root.click();
    fixture.detectChanges();

    expect(component.currentWord()).toBe('despacho técnico.');
    expect(emitted).toEqual(['despacho técnico.']);
    expect(root.getAttribute('aria-label')).toBe('De la planificación al despacho técnico.');

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    root.dispatchEvent(enterEvent);
    fixture.detectChanges();

    expect(component.currentWord()).toBe('control en vivo.');
    expect(emitted).toEqual(['despacho técnico.', 'control en vivo.']);
  });

  it('auto-cycles every 2.4s and removes outgoing word node after 1s', async () => {
    await TestBed.configureTestingModule({
      imports: [WordRollComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WordRollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.currentWord()).toBe('montaje final.');
    vi.advanceTimersByTime(2400);
    fixture.detectChanges();

    expect(component.currentWord()).toBe('despacho técnico.');
    expect(fixture.nativeElement.querySelectorAll('.emx-roll-word').length).toBe(2);

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.emx-roll-word').length).toBe(1);
  });
});
