import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  computed
} from '@angular/core';

export type StatusTone = 'neutral' | 'brand' | 'positive' | 'negative' | 'warning';
export type StatusSize = 'sm' | 'md';
export type StatusGlyph = 'check' | 'cross' | 'warning' | 'clock' | 'info' | 'pulse' | 'dot';

let pillCounter = 0;

@Component({
  selector: 'emx-status-pill',
  standalone: true,
  template: `
    <span
      class="emx-status-pill"
      [class]="'emx-status-pill tone-' + tone() + ' size-' + size()"
      [attr.data-tone]="tone()"
      [attr.data-size]="size()"
    >
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
      } @else if (glyph() === 'warning') {
        <svg viewBox="0 0 16 16" class="pill-glyph" aria-hidden="true">
          <mask [attr.id]="maskId">
            <rect width="16" height="16" fill="white" />
            <path d="M8 5.2v3" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" />
            <circle cx="8" cy="10.8" r="0.9" fill="black" />
          </mask>
          <path d="M8 1.1c.55 0 1.03.29 1.3.76l6.03 10.72c.55.98-.16 2.2-1.3 2.2H1.97c-1.14 0-1.85-1.22-1.3-2.2L6.7 1.86c.27-.47.75-.76 1.3-.76Z" fill="currentColor" [attr.mask]="'url(#' + maskId + ')'" />
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
        <span class="pill-pulse-dot" aria-hidden="true"></span>
      } @else if (glyph() === 'dot') {
        <span class="pill-dot" aria-hidden="true"></span>
      }
      <span class="pill-label"><ng-content /></span>
    </span>
  `,
  styleUrls: ['./status-pill.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPill {
  readonly tone = input<StatusTone>('neutral');
  readonly size = input<StatusSize>('md');
  readonly glyph = input<StatusGlyph | null>(null);

  readonly maskId = `emx-pill-mask-${++pillCounter}`;
}

@Component({
  selector: 'emx-tag',
  standalone: true,
  template: `
    <span
      class="emx-tag"
      [class]="'emx-tag tone-' + tone() + (interactive() ? ' is-interactive' : '')"
      [class.is-interactive]="interactive()"
      [attr.data-tone]="tone()"
    >
      <ng-content />
    </span>
  `,
  styleUrls: ['./status-pill.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tag {
  readonly tone = input<StatusTone>('neutral');
  readonly interactive = input<boolean>(false);
}
