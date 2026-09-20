import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProductionViewModel } from '../../core/models/production.model';
import { StatusChip } from './status-chip';
import { Icon } from './icon';

@Component({
  selector: 'emx-production-table',
  standalone: true,
  imports: [StatusChip, Icon],
  template: `
    <p class="table-hint">Desliza la tabla para ver estados, cuadrillas y equipos.</p>
    <div class="table-scroll" role="region" [attr.aria-label]="caption()" tabindex="0">
      <table class="data-table production-table">
        <caption class="sr-only">
          {{
            caption()
          }}. Todos los registros son ficticios.
        </caption>
        <thead>
          <tr>
            <th scope="col">Producción / cliente</th>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Estado</th>
            <th scope="col">Cuadrilla</th>
            <th scope="col">Equipos</th>
            <th scope="col" aria-label="Acciones"></th>
          </tr>
        </thead>
        <tbody>
          @for (event of rows(); track event.id) {
            <tr class="clickable">
              <td>
                <div class="event-cell">
                  <span
                    class="event-monogram"
                    [attr.data-category]="event.category"
                    aria-hidden="true"
                    >{{ event.name.slice(0, 1) }}</span
                  >
                  <div>
                    <strong>{{ event.name }}</strong
                    ><span class="cell-meta">{{ event.id }} · {{ event.client }}</span
                    ><span class="cell-meta venue">{{ event.venue }}</span>
                  </div>
                </div>
              </td>
              <td>
                <strong>{{ event.day }} sep</strong
                ><span class="cell-meta">{{ event.time }} h</span>
              </td>
              <td><emx-status [status]="event.status" /></td>
              <td>
                <span
                  class="crew-dot"
                  [class.unassigned]="event.crew === 'Por asignar'"
                  aria-hidden="true"
                ></span
                >{{ event.crew }}
              </td>
              <td class="numeric">
                {{ event.equipment }}<span class="cell-meta">reservados</span>
              </td>
              <td class="row-action">
                <emx-icon name="chevron-right" />
              </td>
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
  readonly caption = input('Producciones de demostración');
}
