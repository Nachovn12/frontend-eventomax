import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DateTimePickerComponent } from './date-time-picker.component';
import { parseScheduledAtToInstant } from '../../../core/utils/chile-time';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateTimePickerComponent],
  template: `
    <form [formGroup]="form">
      <emx-date-time-picker
        inputId="test-dtp"
        formControlName="scheduledAt"
        [invalid]="form.controls.scheduledAt.invalid && form.controls.scheduledAt.touched"
        [nowProvider]="nowFn()"
      />
    </form>
  `,
})
class TestHostComponent {
  readonly form = new FormGroup({
    scheduledAt: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  readonly nowFn = signal<() => Date>(() => new Date('2026-11-24T17:30:00Z')); // 2026-11-24 14:30 CLST (UTC-3)
}

describe('DateTimePickerComponent (UI/UX-03)', () => {
  const createHost = (fixedNowIso = '2026-11-24T17:30:00Z') => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.nowFn.set(() => new Date(fixedNowIso));
    fixture.detectChanges();
    return fixture;
  };

  it('shows placeholder when empty, formats selected value as dd/MM/yyyy · HH:mm h, and preserves YYYY-MM-DDTHH:mm contract', () => {
    const fixture = createHost();
    const trigger = fixture.nativeElement.querySelector('#test-dtp') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('Seleccionar fecha y hora');

    // Open, select 2026-11-28 at 19:47 (1-minute precision), apply
    trigger.click();
    fixture.detectChanges();

    const day28 = fixture.nativeElement.querySelector('button[data-day-key="2026-11-28"]') as HTMLButtonElement;
    expect(day28).not.toBeNull();
    day28.click();
    fixture.detectChanges();

    const hourInput = fixture.nativeElement.querySelector('#test-dtp-hour') as HTMLInputElement;
    const minInput = fixture.nativeElement.querySelector('#test-dtp-minute') as HTMLInputElement;
    hourInput.value = '19';
    hourInput.dispatchEvent(new Event('input'));
    minInput.value = '47';
    minInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Draft must NOT mutate FormControl before clicking Aplicar
    expect(fixture.componentInstance.form.controls.scheduledAt.value).toBe('');

    const applyBtn = fixture.nativeElement.querySelector('.emx-dtp-btn-apply') as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(false);
    applyBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.scheduledAt.value).toBe('2026-11-28T19:47');
    expect(trigger.textContent?.trim()).toBe('28/11/2026 · 19:47 h');
    expect(fixture.nativeElement.querySelector('.emx-dtp-popover')).toBeNull();
  });

  it('disables past dates in Chile time, rejects past time on today, and prevents Hoy from picking a past time', () => {
    // 2026-11-24T17:30:20Z = 2026-11-24 14:30:20 CLST
    const fixture = createHost('2026-11-24T17:30:20Z');
    const trigger = fixture.nativeElement.querySelector('#test-dtp') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const pastDay = fixture.nativeElement.querySelector('button[data-day-key="2026-11-23"]') as HTMLButtonElement;
    const todayBtn = fixture.nativeElement.querySelector('button[data-day-key="2026-11-24"]') as HTMLButtonElement;
    expect(pastDay.disabled).toBe(true);
    expect(todayBtn.disabled).toBe(false);
    expect(todayBtn.classList.contains('is-today')).toBe(true);

    // Selecting a past hour on today (10:15 < 14:30:20) disables Aplicar and shows alert
    todayBtn.click();
    const hourInput = fixture.nativeElement.querySelector('#test-dtp-hour') as HTMLInputElement;
    const minInput = fixture.nativeElement.querySelector('#test-dtp-minute') as HTMLInputElement;
    hourInput.value = '10';
    hourInput.dispatchEvent(new Event('input'));
    minInput.value = '15';
    minInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const applyBtn = fixture.nativeElement.querySelector('.emx-dtp-btn-apply') as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.emx-dtp-error')?.textContent).toContain('ya pasó');

    // Clicking "Hoy" adjusts time to next valid future minute (14:31 CLST)
    const hoyBtn = fixture.nativeElement.querySelector('.emx-dtp-btn-today') as HTMLButtonElement;
    hoyBtn.click();
    fixture.detectChanges();

    expect(hourInput.value).toBe('14');
    expect(minInput.value).toBe('31');
    expect(applyBtn.disabled).toBe(false);
  });

  it('supports month/year navigation, leap year Feb 29 (2028), cancel without overwriting, reopen with previous value, and form reset', () => {
    const fixture = createHost('2026-11-24T17:30:00Z');
    fixture.componentInstance.form.controls.scheduledAt.setValue('2026-12-15T18:00');
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('#test-dtp') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('15/12/2026 · 18:00 h');

    // Reopen preserves previous selection (2026-12-15 18:00)
    trigger.click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#test-dtp-hour') as HTMLInputElement).value).toBe('18');
    expect((fixture.nativeElement.querySelector('#test-dtp-minute') as HTMLInputElement).value).toBe('00');

    // Navigate to Feb 2028 (leap year) via selects
    const yearSelect = fixture.nativeElement.querySelector('.emx-dtp-select--year') as HTMLSelectElement;
    const monthSelect = fixture.nativeElement.querySelector('.emx-dtp-select--month') as HTMLSelectElement;
    yearSelect.value = '2028';
    yearSelect.dispatchEvent(new Event('change'));
    monthSelect.value = '2';
    monthSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const leapDay = fixture.nativeElement.querySelector('button[data-day-key="2028-02-29"]') as HTMLButtonElement;
    expect(leapDay).not.toBeNull();
    expect(leapDay.disabled).toBe(false);
    leapDay.click();
    fixture.detectChanges();

    // Cancel must NOT overwrite original value
    const cancelBtn = fixture.nativeElement.querySelector('.emx-dtp-btn-cancel') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.scheduledAt.value).toBe('2026-12-15T18:00');
    expect(trigger.textContent?.trim()).toBe('15/12/2026 · 18:00 h');

    // Reopen and apply leap day 2028-02-29 at 09:05
    trigger.click();
    fixture.detectChanges();
    const y2 = fixture.nativeElement.querySelector('.emx-dtp-select--year') as HTMLSelectElement;
    const m2 = fixture.nativeElement.querySelector('.emx-dtp-select--month') as HTMLSelectElement;
    y2.value = '2028';
    y2.dispatchEvent(new Event('change'));
    m2.value = '2';
    m2.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[data-day-key="2028-02-29"]') as HTMLButtonElement).click();
    const h2 = fixture.nativeElement.querySelector('#test-dtp-hour') as HTMLInputElement;
    const min2 = fixture.nativeElement.querySelector('#test-dtp-minute') as HTMLInputElement;
    h2.value = '09';
    h2.dispatchEvent(new Event('input'));
    min2.value = '05';
    min2.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.emx-dtp-btn-apply') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.scheduledAt.value).toBe('2028-02-29T09:05');
    expect(trigger.textContent?.trim()).toBe('29/02/2028 · 09:05 h');

    // Form reset clears display back to placeholder
    fixture.componentInstance.form.reset();
    fixture.detectChanges();
    expect(trigger.textContent?.trim()).toBe('Seleccionar fecha y hora');
  });

  it('displays CLST (UTC-3) in summer and CLT (UTC-4) in winter, and handles DST nonexistent & ambiguous transitions', () => {
    // Fixed now: 2026-01-10T12:00:00Z (well before all 2026 transitions)
    const fixture = createHost('2026-01-10T12:00:00Z');
    const trigger = fixture.nativeElement.querySelector('#test-dtp') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    // 1. Summer date (Jan 20, 2026 15:00) -> CLST (UTC-3)
    const tzBar = () => fixture.nativeElement.querySelector('.emx-dtp-tz-bar')?.textContent ?? '';
    expect(tzBar()).toContain('Hora de Chile continental');
    expect(tzBar()).toContain('CLST (UTC-3)');

    // 2. Winter date (Jul 15, 2026 15:00) -> CLT (UTC-4)
    const monthSelect = fixture.nativeElement.querySelector('.emx-dtp-select--month') as HTMLSelectElement;
    monthSelect.value = '7';
    monthSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-day-key="2026-07-15"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(tzBar()).toContain('CLT (UTC-4)');

    // 3. Spring-forward nonexistent hour in America/Santiago: 2026-09-06 00:30 does NOT exist (clock jumps 00:00 -> 01:00)
    monthSelect.value = '9';
    monthSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-day-key="2026-09-06"]') as HTMLButtonElement).click();
    const hourInput = fixture.nativeElement.querySelector('#test-dtp-hour') as HTMLInputElement;
    const minInput = fixture.nativeElement.querySelector('#test-dtp-minute') as HTMLInputElement;
    hourInput.value = '00';
    hourInput.dispatchEvent(new Event('input'));
    minInput.value = '30';
    minInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const applyBtn = fixture.nativeElement.querySelector('.emx-dtp-btn-apply') as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.emx-dtp-error')?.textContent).toContain('no existe en Chile continental');

    // Valid hour after spring-forward (01:30 CLST) is accepted
    hourInput.value = '01';
    hourInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(applyBtn.disabled).toBe(false);
    expect(tzBar()).toContain('CLST (UTC-3)');

    // 4. Autumn fall-back ambiguous hour in America/Santiago: 2026-04-04 23:30 occurs twice (CLST then CLT)
    monthSelect.value = '4';
    monthSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-day-key="2026-04-04"]') as HTMLButtonElement).click();
    hourInput.value = '23';
    hourInput.dispatchEvent(new Event('input'));
    minInput.value = '30';
    minInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(applyBtn.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.emx-dtp-dst-note')?.textContent).toContain('primera ocurrencia');
    applyBtn.click();
    fixture.detectChanges();

    const committed = fixture.componentInstance.form.controls.scheduledAt.value;
    expect(committed).toBe('2026-04-04T23:30');
    // Verify equivalence with chile-time parser (23:30 CLST = 2026-04-05T02:30:00.000Z)
    expect(parseScheduledAtToInstant(committed)?.toISOString()).toBe('2026-04-05T02:30:00.000Z');
  });

  it('handles Escape without propagating to parent modal and rejects invalid/incomplete 24h inputs', () => {
    const fixture = createHost('2026-11-24T17:30:00Z');
    const trigger = fixture.nativeElement.querySelector('#test-dtp') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    // Invalid hour (25) and incomplete minutes ("") disable Aplicar
    const hourInput = fixture.nativeElement.querySelector('#test-dtp-hour') as HTMLInputElement;
    const minInput = fixture.nativeElement.querySelector('#test-dtp-minute') as HTMLInputElement;
    const applyBtn = fixture.nativeElement.querySelector('.emx-dtp-btn-apply') as HTMLButtonElement;

    hourInput.value = '25';
    hourInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(applyBtn.disabled).toBe(true);

    hourInput.value = '18';
    hourInput.dispatchEvent(new Event('input'));
    minInput.value = '';
    minInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(applyBtn.disabled).toBe(true);

    // Escape stops propagation and closes popover without changing FormControl
    let parentSawEscape = false;
    fixture.nativeElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') parentSawEscape = true;
    });
    const popover = fixture.nativeElement.querySelector('.emx-dtp-popover') as HTMLElement;
    popover.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(parentSawEscape).toBe(false);
    expect(fixture.nativeElement.querySelector('.emx-dtp-popover')).toBeNull();
    expect(fixture.componentInstance.form.controls.scheduledAt.value).toBe('');
  });
});
