import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { ProductionStatus } from '../../core/models/production.model';

@Component({
  selector: 'emx-status',
  standalone: true,
  template:
    '<span class="status-chip" [attr.data-status]="status()"><span class="status-dot" aria-hidden="true"></span>{{ label() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  readonly status = input.required<ProductionStatus>();
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
