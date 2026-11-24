import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateCalendarComponent } from './date-calendar.component';
import { DateRangePickerComponent } from './date-range-picker.component';

@Component({
  standalone: true,
  imports: [DateCalendarComponent, DateRangePickerComponent],
  template: `
    <emx-date-calendar
      [showToday]="true"
      (dateSelected)="onDateSelected($event)"
    />

    <emx-date-range-picker
      [value]="currentRange"
      (valueChange)="onRangeChange($event)"
    />
  `,
})
class TestHostComponent {
  currentRange = 'last24h';
  selectedDate: Date | null = null;
  selectedRangePreset: string | null = null;

  onDateSelected(d: Date) {
    this.selectedDate = d;
  }
  onRangeChange(preset: string) {
    this.selectedRangePreset = preset;
    this.currentRange = preset;
  }
}

describe('Apple Design System Date Calendar & Picker (Board UI 1:1)', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, DateCalendarComponent, DateRangePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  describe('DateCalendarComponent', () => {
    it('renders month header and 7 weekday headers', () => {
      const monthTitle = fixture.nativeElement.querySelector('.emx-month-title');
      expect(monthTitle).toBeTruthy();
      expect(monthTitle.textContent.length).toBeGreaterThan(3);

      const weekdayHeaders = fixture.nativeElement.querySelectorAll('.emx-weekday-header');
      expect(weekdayHeaders).toHaveLength(7);
      expect(weekdayHeaders[0].textContent.trim()).toBe('Lu');
      expect(weekdayHeaders[6].textContent.trim()).toBe('Do');
    });

    it('navigates next and previous months using 16px chevrons', () => {
      const nextBtn = fixture.nativeElement.querySelector('.emx-month-nav-btn[aria-label="Mes siguiente"]');
      const prevBtn = fixture.nativeElement.querySelector('.emx-month-nav-btn[aria-label="Mes anterior"]');

      expect(nextBtn).toBeTruthy();
      expect(prevBtn).toBeTruthy();

      const initialTitle = fixture.nativeElement.querySelector('.emx-month-title').textContent;
      nextBtn.click();
      fixture.detectChanges();

      const afterNextTitle = fixture.nativeElement.querySelector('.emx-month-title').textContent;
      expect(afterNextTitle).not.toBe(initialTitle);

      prevBtn.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.emx-month-title').textContent).toBe(initialTitle);
    });

    it('emits selected date when clicking an active day cell', () => {
      const dayCells = fixture.nativeElement.querySelectorAll('.emx-day-cell:not(.outside-month)');
      expect(dayCells.length).toBeGreaterThan(20);

      const targetCell = dayCells[10] as HTMLButtonElement;
      targetCell.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedDate).toBeTruthy();
    });
  });

  describe('DateRangePickerComponent', () => {
    it('renders trigger button with calendar icon and label', () => {
      const trigger = fixture.nativeElement.querySelector('.emx-date-trigger');
      expect(trigger).toBeTruthy();
      expect(trigger.textContent).toContain('Últimas 24 horas');
    });

    it('opens popover dialog with presets on trigger click and applies selection', () => {
      const trigger = fixture.nativeElement.querySelector('.emx-date-trigger') as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();

      const popover = fixture.nativeElement.querySelector('.emx-date-picker-popover');
      expect(popover).toBeTruthy();

      const presets = popover.querySelectorAll('.emx-preset-btn');
      expect(presets.length).toBeGreaterThanOrEqual(4);

      // Click "Últimos 7 días" preset
      const preset7d = Array.from(presets).find((btn: any) => btn.textContent.includes('Últimos 7 días')) as HTMLButtonElement;
      expect(preset7d).toBeTruthy();
      preset7d.click();
      fixture.detectChanges();

      // Click "Aplicar"
      const applyBtn = popover.querySelector('.emx-date-footer-actions emx-button:nth-of-type(2) button') as HTMLButtonElement;
      expect(applyBtn).toBeTruthy();
      applyBtn.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedRangePreset).toBe('last7d');
      expect(fixture.nativeElement.querySelector('.emx-date-picker-popover')).toBeNull();
    });

    it('UI/UX-08: renders corporate header with Chile timezone and discards draft changes on Cancel', () => {
      const trigger = fixture.nativeElement.querySelector('.emx-date-trigger') as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();

      const popover = fixture.nativeElement.querySelector('.emx-date-picker-popover') as HTMLElement;
      expect(popover.textContent).toContain('Período de análisis');
      expect(popover.textContent).toContain('America/Santiago');
      expect(popover.textContent).toContain('Aplicar período');

      // Select 7d preset then Cancel -> must NOT emit change
      const preset7d = Array.from(popover.querySelectorAll<HTMLButtonElement>('.emx-preset-btn'))
        .find((b) => b.textContent?.includes('Últimos 7 días'))!;
      preset7d.click();
      fixture.detectChanges();

      const cancelBtn = popover.querySelector('.emx-date-footer-actions emx-button:nth-of-type(1) button') as HTMLButtonElement;
      cancelBtn.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedRangePreset).toBeNull();
      expect(fixture.nativeElement.querySelector('.emx-date-picker-popover')).toBeNull();
    });
  });
});
