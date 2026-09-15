import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DemoStatus } from '../../demo/eventomax.fixtures';
@Component({
  selector: 'emx-status',
  standalone: true,
  template:
    '<span class="status-chip" [attr.data-status]="status()"><span class="status-dot" aria-hidden="true"></span>{{ status() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  readonly status = input.required<DemoStatus>();
}
