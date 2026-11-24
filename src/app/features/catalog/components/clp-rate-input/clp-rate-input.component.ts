import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const CL_FORMATTER = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatClpRateDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '';
  }
  return CL_FORMATTER.format(value);
}

/**
 * Parses user-typed or pasted Chilean CLP currency strings safely into exact numbers.
 * Supports: "850000", "850.000", "$850.000 CLP", "26.000,25", "26000,25", "26000.25".
 */
export function parseClpRateInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,]/g, '').trim();
  if (!cleaned) return 0;

  let normalized = cleaned;
  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  if (hasDot && hasComma) {
    // Standard es-CL: "." thousands, "," decimal (e.g., 1.850.000,50)
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // Only comma: decimal separator (e.g., 26000,25)
    const parts = cleaned.split(',');
    normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned.replace(',', '.');
  } else if (hasDot) {
    const parts = cleaned.split('.');
    // Multiple dots (1.850.000) OR single dot with 3 trailing digits (850.000) => thousands separator
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = cleaned.replace(/\./g, '');
    } else {
      // Single dot with 1-2 decimals (e.g., pasted 26000.25) => decimal point
      normalized = cleaned;
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatTypingDisplay(raw: string): string {
  const cleaned = raw.replace(/[^0-9.,]/g, '');
  if (!cleaned) return '';

  // Detect explicit decimal comma while typing
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx >= 0) {
    const intDigits = cleaned.slice(0, commaIdx).replace(/\D/g, '');
    const decDigits = cleaned.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2);
    const intFormatted = intDigits ? CL_FORMATTER.format(Number(intDigits)) : '0';
    return `${intFormatted},${decDigits}`;
  }

  // If pasted a decimal dot with 1-2 digits (e.g., 26000.25), convert cleanly to es-CL comma
  const parts = cleaned.split('.');
  if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
    const intDigits = parts[0].replace(/\D/g, '');
    const decDigits = parts[1].replace(/\D/g, '').slice(0, 2);
    const intFormatted = intDigits ? CL_FORMATTER.format(Number(intDigits)) : '0';
    return `${intFormatted},${decDigits}`;
  }

  const allDigits = cleaned.replace(/\D/g, '');
  if (!allDigits) return '';
  return CL_FORMATTER.format(Number(allDigits));
}

@Component({
  selector: 'emx-clp-rate-input',
  standalone: true,
  templateUrl: './clp-rate-input.component.html',
  styleUrl: './clp-rate-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ClpRateInputComponent),
      multi: true,
    },
  ],
})
export class ClpRateInputComponent implements ControlValueAccessor {
  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('rateInput');

  readonly inputId = input<string>('service-modal-rate');
  readonly placeholder = input<string>('Ej: 850.000');

  readonly numericValue = signal<number>(0);
  readonly displayText = signal<string>('');
  readonly disabled = signal<boolean>(false);

  readonly formattedPreview = computed<string>(() => {
    const val = this.numericValue();
    return Number.isFinite(val) && val > 0 ? `$${CL_FORMATTER.format(val)} CLP` : '';
  });

  private onChange: (val: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: number | null): void {
    const num = typeof val === 'number' && Number.isFinite(val) ? val : 0;
    this.numericValue.set(num);
    this.displayText.set(formatClpRateDisplay(num));
  }

  registerOnChange(fn: (val: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const tokensBeforeCaret = raw.slice(0, caret).replace(/[^0-9,]/g, '').length;

    const formatted = formatTypingDisplay(raw);
    const parsed = parseClpRateInput(formatted);

    this.displayText.set(formatted);
    this.numericValue.set(parsed);
    input.value = formatted;

    // Restore caret position proportionally to digits/comma typed before caret
    let seen = 0;
    let nextPos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/[0-9,]/.test(formatted[i])) {
        seen++;
      }
      if (seen >= tokensBeforeCaret) {
        nextPos = tokensBeforeCaret === 0 ? 0 : i + 1;
        break;
      }
    }
    if (typeof input.setSelectionRange === 'function') {
      input.setSelectionRange(nextPos, nextPos);
    }

    this.onChange(parsed);
  }

  onBlur(): void {
    this.onTouched();
    const val = this.numericValue();
    const canonical = formatClpRateDisplay(val);
    this.displayText.set(canonical);
    const el = this.inputEl()?.nativeElement;
    if (el) {
      el.value = canonical;
    }
  }
}
