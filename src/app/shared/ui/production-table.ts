import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProductionViewModel } from '../../core/models/production.model';
import { StatusChip } from './status-chip';

@Component({
  selector: 'emx-production-table',
  standalone: true,
  imports: [StatusChip, DatePipe],
  template: `
    <div class="table-scroll" role="region" [attr.aria-label]="caption()" tabindex="0">
      <table class="data-table production-table" [class.is-selectable]="selectable()">
        <caption class="sr-only">
          {{ caption() }}
        </caption>
        <colgroup>
          <col class="col-production" />
          <col class="col-location" />
          <col class="col-schedule" />
          <col class="col-status" />
          @if (selectable()) {
            <col class="col-action" />
          }
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Producción</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Fecha programada</th>
            <th scope="col">Estado</th>
            @if (selectable()) {
              <th scope="col" class="th-action">Acción</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (event of rows(); track event.id) {
            <tr
              [class.row-selectable]="selectable()"
              [class.row-selected]="selectable() && selectedId() === event.id"
              [attr.aria-selected]="selectable() ? (selectedId() === event.id) : null"
              (click)="onRowClick(event)"
            >
              <td class="cell-production">
                <div class="event-cell">
                  <span class="event-monogram" aria-hidden="true">{{ event.name.slice(0, 1) }}</span>
                  <div class="event-info">
                    <strong class="event-name">{{ event.name }}</strong>
                    <span class="cell-meta">#{{ event.id }} · {{ event.organizerId }}</span>
                  </div>
                </div>
              </td>
              <td class="cell-location">
                <span class="mobile-cell-label" aria-hidden="true">Ubicación</span>
                <span class="venue-text">{{ event.location }}</span>
              </td>
              <td class="cell-schedule">
                <span class="mobile-cell-label" aria-hidden="true">Fecha programada</span>
                <strong class="schedule-date">{{ event.scheduledAt | date:'dd MMM yyyy' }}</strong>
                <span class="cell-meta">{{ event.scheduledAt | date:'HH:mm' }} h</span>
              </td>
              <td class="cell-status">
                <span class="mobile-cell-label" aria-hidden="true">Estado</span>
                <emx-status [status]="event.status" />
              </td>
              @if (selectable()) {
                <td class="cell-action">
                  <button
                    type="button"
                    class="row-select-btn"
                    [class.active]="selectedId() === event.id"
                    [attr.aria-pressed]="selectedId() === event.id"
                    [attr.aria-label]="(selectedId() === event.id ? 'Producción seleccionada: ' : 'Gestionar producción ') + event.name"
                    (click)="onButtonSelect(event, $event)"
                  >
                    {{ selectedId() === event.id ? 'Seleccionada' : 'Gestionar' }}
                  </button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      container-type: inline-size;
    }
    .table-scroll {
      overflow-x: auto;
    }
    .data-table.production-table {
      width: 100%;
      table-layout: fixed;
      white-space: normal;
    }
    .col-production { width: 35%; }
    .col-location { width: 25%; }
    .col-schedule { width: 22%; }
    .col-status { width: 18%; }
    .data-table.production-table.is-selectable .col-production { width: 30%; }
    .data-table.production-table.is-selectable .col-location { width: 19%; }
    .data-table.production-table.is-selectable .col-schedule { width: 18%; }
    .data-table.production-table.is-selectable .col-status { width: 14%; }
    .data-table.production-table.is-selectable .col-action { width: 19%; }
    .data-table.production-table th,
    .data-table.production-table td {
      padding-inline: 16px;
    }
    .th-action,
    .cell-action {
      text-align: right;
      white-space: nowrap;
    }
    .event-info {
      min-width: 0;
    }
    .event-name {
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
    .venue-text {
      color: var(--text-muted);
      font-weight: 400;
      overflow-wrap: anywhere;
      line-height: 1.4;
    }
    .cell-schedule {
      font-variant-numeric: tabular-nums;
    }
    .schedule-date {
      font-weight: 500;
    }
    .row-selectable {
      cursor: pointer;
    }
    .row-selected {
      background-color: var(--brand-accent-bg) !important;
    }
    .row-selected td:first-child {
      box-shadow: inset 3px 0 0 var(--brand-primary);
    }
    .row-select-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-base);
      background: var(--bg-surface);
      color: var(--text-main);
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
    }
    .row-select-btn:hover {
      border-color: var(--brand-accent);
      color: var(--brand-primary);
      background: #fff;
    }
    .row-select-btn.active {
      background: var(--brand-primary);
      border-color: var(--brand-primary);
      color: #fff;
    }
    .row-select-btn:focus-visible {
      outline: 2px solid var(--brand-primary);
      outline-offset: 2px;
    }
    .mobile-cell-label {
      display: none;
    }
    @container (max-width: 640px) {
      .data-table.production-table,
      .data-table.production-table tbody {
        display: block;
      }
      .data-table.production-table colgroup,
      .data-table.production-table thead {
        display: none;
      }
      .data-table.production-table tbody tr {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px 16px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-base);
      }
      .data-table.production-table tbody tr:last-child {
        border-bottom: 0;
      }
      .data-table.production-table td {
        display: block;
        padding: 0;
        border: 0;
        min-width: 0;
      }
      .cell-production {
        grid-column: 1 / 2;
        grid-row: 1;
      }
      .cell-status {
        grid-column: 2 / 3;
        grid-row: 1;
        justify-self: end;
        align-self: center;
      }
      .cell-status .mobile-cell-label {
        display: none;
      }
      .cell-location {
        grid-column: 1 / 2;
      }
      .cell-schedule {
        grid-column: 2 / 3;
        text-align: right;
      }
      .cell-action {
        grid-column: 1 / -1;
        text-align: stretch;
        padding-top: 4px;
      }
      .row-select-btn {
        width: 100%;
        min-height: 38px;
      }
      .mobile-cell-label {
        display: block;
        font-size: 11px;
        color: var(--text-light);
        margin-bottom: 2px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionTable {
  readonly rows = input.required<readonly ProductionViewModel[]>();
  readonly caption = input('Listado de producciones');
  readonly selectable = input(false);
  readonly selectedId = input<number | null>(null);
  readonly selectProduction = output<ProductionViewModel>();

  onRowClick(event: ProductionViewModel): void {
    if (!this.selectable()) return;
    this.selectProduction.emit(event);
  }

  onButtonSelect(event: ProductionViewModel, domEvent: MouseEvent): void {
    domEvent.stopPropagation();
    if (!this.selectable()) return;
    this.selectProduction.emit(event);
  }
}
