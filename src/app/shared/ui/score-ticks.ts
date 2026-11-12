import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'emx-score-ticks',
  standalone: true,
  template: `
    <div class="emx-score" [attr.aria-label]="computedAriaLabel()" [attr.title]="computedAriaLabel()">
      @if (showValue()) {
        <span class="emx-score-val">{{ score() }}</span>
      }
      <div class="emx-ticks-meter" aria-hidden="true">
        @for (tick of ticks(); track tick.index) {
          <span
            class="emx-tick"
            [class.is-active]="tick.active"
            [class.tier-green]="score() >= 75"
            [class.tier-blue]="score() >= 60 && score() < 75"
            [class.tier-amber]="score() < 60"
          ></span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }
    .emx-score {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 16px;
      font-weight: 500;
      color: #333333;
      font-variant-numeric: tabular-nums;
    }
    .emx-score-val {
      min-width: 18px;
      font-weight: 500;
      color: #333333;
      text-align: right;
    }
    .emx-ticks-meter {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 8px;
    }
    .emx-tick {
      width: 3px;
      height: 8px;
      border-radius: 1px;
      background-color: #E5E7EB;
      display: block;
      transition: background-color 140ms ease;
    }
    .emx-tick.is-active.tier-green {
      background-color: #10B981;
    }
    .emx-tick.is-active.tier-blue {
      background-color: #3B82F6;
    }
    .emx-tick.is-active.tier-amber {
      background-color: #F59E0B;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreTicks {
  readonly score = input<number>(0);
  readonly showValue = input<boolean>(true);
  readonly label = input<string>('');

  readonly activeTicksCount = computed(() => {
    const s = Math.max(0, Math.min(100, this.score()));
    return Math.round((s / 100) * 11);
  });

  readonly ticks = computed(() => {
    const count = this.activeTicksCount();
    return Array.from({ length: 11 }, (_, i) => ({
      index: i,
      active: i < count,
    }));
  });

  readonly computedAriaLabel = computed(() => {
    const prefix = this.label() ? `${this.label()}: ` : 'Score: ';
    return `${prefix}${this.score()}/100`;
  });
}
