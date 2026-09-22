import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProductionViewModel } from '../../core/models/production.model';
import { StatusChip } from './status-chip';
import { Icon } from './icon';

@Component({
  selector: 'emx-production-table',
  standalone: true,
  imports: [StatusChip, DatePipe],
  template: `
    <p class="table-hint">Desliza la tabla para ver estados y detalles.</p>
    <div class="table-scroll" role="region" [attr.aria-label]="caption()" tabindex="0">
      <table class="data-table production-table">
        <caption class="sr-only">
          {{ caption() }}
        </caption>
        <colgroup>
          <col style="width: 35%; min-width: 260px;" />
          <col style="width: 25%; min-width: 180px;" />
          <col style="width: 20%; min-width: 160px;" />
          <col style="width: 20%; min-width: 140px;" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Producción</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (event of rows(); track event.id) {
            <tr>
              <td>
                <div class="event-cell">
                  <span class="event-monogram" aria-hidden="true">{{ event.name.slice(0, 1) }}</span>
                  <div>
                    <strong>{{ event.name }}</strong>
                    <span class="cell-meta" style="font-size: 12px; opacity: 0.85; font-weight: 400;">{{ event.organizerId }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="venue-text" style="color: var(--text-muted); font-weight: 400;">{{ event.location }}</span>
              </td>
              <td style="font-variant-numeric: tabular-nums;">
                <strong style="font-weight: 500;">{{ event.scheduledAt | date:'dd MMM yyyy' }}</strong>
                <span class="cell-meta">{{ event.scheduledAt | date:'HH:mm' }} h</span>
              </td>
              <td><emx-status [status]="event.status" /></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionTable {
  readonly rows = input.required<readonly ProductionViewModel[]>();
  readonly caption = input('Listado de producciones');
}
