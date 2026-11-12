import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  computed
} from '@angular/core';
import { ProductionStatus } from '../../core/models/production.model';
import { StatusTone, StatusSize, StatusGlyph } from './status-pill/status-pill';

let chipCounter = 0;

@Component({
  selector: 'emx-status',
  standalone: true,
  template: `
    <span
      class="status-chip"
      [class]="'tone-' + tone() + ' size-' + size()"
      [attr.data-status]="status()"
      [attr.data-tone]="tone()"
    >
      <span class="status-dot-wrap" aria-hidden="true">
        @if (glyph() === 'check') {
          <svg viewBox="0 0 16 16" class="pill-glyph" aria-hidden="true">
            <mask [attr.id]="maskId">
              <rect width="16" height="16" fill="white" />
              <path d="M4.9 8.3 7 10.3l4.1-4.5" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </mask>
            <circle cx="8" cy="8" r="8" fill="currentColor" [attr.mask]="'url(#' + maskId + ')'" />
          </svg>
        } @else if (glyph() === 'cross') {
          <svg viewBox="0 0 16 16" class="pill-glyph" aria-hidden="true">
            <mask [attr.id]="maskId">
              <rect width="16" height="16" fill="white" />
              <path d="m5.6 5.6 4.8 4.8m0-4.8-4.8 4.8" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </mask>
            <circle cx="8" cy="8" r="8" fill="currentColor" [attr.mask]="'url(#' + maskId + ')'" />
          </svg>
        } @else if (glyph() === 'clock') {
          <svg viewBox="0 0 16 16" class="pill-glyph" aria-hidden="true">
            <mask [attr.id]="maskId">
              <rect width="16" height="16" fill="white" />
              <path d="M8 4.3v3.9l2.5 1.5" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </mask>
            <circle cx="8" cy="8" r="8" fill="currentColor" [attr.mask]="'url(#' + maskId + ')'" />
          </svg>
        } @else if (glyph() === 'pulse') {
          <span class="status-dot live-pulse"></span>
        } @else {
          <span class="status-dot"></span>
        }
      </span>
      <span class="status-label">{{ label() }}</span>
    </span>
  `,
  styleUrls: ['./status-pill/status-pill.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  readonly status = input.required<ProductionStatus>();
  readonly size = input<StatusSize>('sm');

  readonly maskId = `emx-chip-mask-${++chipCounter}`;

  readonly tone = computed<StatusTone>(() => {
    const s = this.status();
    switch (s) {
      case 'CONFIRMADO': return 'brand';
      case 'EN_EJECUCION': return 'positive';
      case 'SOLICITADO': return 'warning';
      case 'CANCELADO': return 'negative';
      case 'EN_MONTAJE': return 'brand';
      case 'CERRADO':
      default: return 'neutral';
    }
  });

  readonly glyph = computed<StatusGlyph>(() => {
    const s = this.status();
    switch (s) {
      case 'CONFIRMADO': return 'check';
      case 'EN_EJECUCION': return 'pulse';
      case 'SOLICITADO': return 'clock';
      case 'CANCELADO': return 'cross';
      case 'EN_MONTAJE': return 'dot';
      case 'CERRADO':
      default: return 'dot';
    }
  });

  readonly label = computed(() => {
    const s = this.status();
    switch (s) {
      case 'SOLICITADO': return 'Solicitado';
      case 'CONFIRMADO': return 'Confirmado';
      case 'EN_MONTAJE': return 'En montaje';
      case 'EN_EJECUCION': return 'En ejecución';
      case 'CERRADO': return 'Cerrado';
      case 'CANCELADO': return 'Cancelado';
      default: return s;
    }
  });
}
