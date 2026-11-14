import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoreTicks } from './score-ticks';

describe('ScoreTicks', () => {
  let fixture: ComponentFixture<ScoreTicks>;
  let component: ScoreTicks;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreTicks],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreTicks);
    component = fixture.componentInstance;
  });

  it('renders exactly 11 ticks in the meter', () => {
    fixture.componentRef.setInput('score', 78);
    fixture.detectChanges();

    const ticks = fixture.nativeElement.querySelectorAll('.emx-tick');
    expect(ticks.length).toBe(11);
  });

  it('calculates active ticks proportionally out of 11 ticks', () => {
    // 100% of 11 = 11 ticks
    fixture.componentRef.setInput('score', 100);
    fixture.detectChanges();
    let activeTicks = fixture.nativeElement.querySelectorAll('.emx-tick.is-active');
    expect(activeTicks.length).toBe(11);

    // 50% of 11 = round(5.5) = 6 ticks
    fixture.componentRef.setInput('score', 50);
    fixture.detectChanges();
    activeTicks = fixture.nativeElement.querySelectorAll('.emx-tick.is-active');
    expect(activeTicks.length).toBe(6);

    // 0% of 11 = 0 ticks
    fixture.componentRef.setInput('score', 0);
    fixture.detectChanges();
    activeTicks = fixture.nativeElement.querySelectorAll('.emx-tick.is-active');
    expect(activeTicks.length).toBe(0);
  });

  it('applies color tiers according to score thresholds', () => {
    // Score >= 75: tier-green
    fixture.componentRef.setInput('score', 99);
    fixture.detectChanges();
    let firstActive = fixture.nativeElement.querySelector('.emx-tick.is-active');
    expect(firstActive?.classList.contains('tier-green')).toBe(true);

    // Score between 60 and 74: tier-blue
    fixture.componentRef.setInput('score', 70);
    fixture.detectChanges();
    firstActive = fixture.nativeElement.querySelector('.emx-tick.is-active');
    expect(firstActive?.classList.contains('tier-blue')).toBe(true);

    // Score < 60: tier-amber
    fixture.componentRef.setInput('score', 45);
    fixture.detectChanges();
    firstActive = fixture.nativeElement.querySelector('.emx-tick.is-active');
    expect(firstActive?.classList.contains('tier-amber')).toBe(true);
  });

  it('displays the numeric score value and accessible label', () => {
    fixture.componentRef.setInput('score', 85);
    fixture.componentRef.setInput('label', 'Habilitación técnica');
    fixture.detectChanges();

    const valueEl = fixture.nativeElement.querySelector('.emx-score-val');
    expect(valueEl.textContent.trim()).toBe('85');

    const container = fixture.nativeElement.querySelector('.emx-score');
    expect(container.getAttribute('aria-label')).toBe('Habilitación técnica: 85/100');
  });
});
