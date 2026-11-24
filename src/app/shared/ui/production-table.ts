import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ProductionViewModel,
  formatOrganizerDisplayLabel,
} from '../../core/models/production.model';
import { ScheduledAtChile, formatScheduledAtChile } from '../../core/utils/chile-time';
import { StatusChip } from './status-chip';
import { ButtonDirective } from './button.component';

@Component({
  selector: 'emx-production-table',
  standalone: true,
  imports: [StatusChip, ButtonDirective, RouterLink],
  template: `
    <div class="table-scroll" role="region" [attr.aria-label]="caption()" tabindex="0">
      <table class="data-table production-table" [class.is-selectable]="selectable() || detailLinks()">
        <caption class="sr-only">
          {{ caption() }}
        </caption>
        <colgroup>
          <col class="col-production" />
          <col class="col-location" />
          <col class="col-schedule" />
          <col class="col-status" />
          @if (selectable() || detailLinks()) {
            <col class="col-action" />
          }
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Producción</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Fecha programada</th>
            <th scope="col">Estado</th>
            @if (selectable() || detailLinks()) {
              <th scope="col" class="th-action">Acción</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (event of rows(); track event.id) {
            @let schedule = formatSchedule(event.scheduledAt);
            <tr
              [class.row-selectable]="selectable()"
              [class.row-selected]="selectable() && selectedId() === event.id"
              [attr.aria-selected]="selectable() ? (selectedId() === event.id) : null"
              (click)="onRowClick(event)"
            >
              <td class="cell-production">
                <div class="event-cell">
                  <div class="cal-date-tile" aria-hidden="true">
                    <span class="cal-month-strip">{{ schedule.monthShort }}</span>
                    <span class="cal-day-num font-mono-num">{{ schedule.day }}</span>
                  </div>
                  <div class="event-info">
                    <strong class="event-name">{{ event.name }}</strong>
                    <div class="cell-meta-strip">
                      <span class="id-tag font-mono-num"><span class="id-hash">#</span>{{ event.id }}</span>
                      <span class="tenant-badge">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        {{ organizerLabel(event) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="cell-location">
                <div class="cell-location-wrap">
                  <svg class="location-pin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <div>
                    <span class="mobile-cell-label" aria-hidden="true">Ubicación</span>
                    <span class="venue-text">{{ event.location }}</span>
                  </div>
                </div>
              </td>
              <td class="cell-schedule">
                <span class="mobile-cell-label" aria-hidden="true">Fecha programada</span>
                <div class="schedule-time-row font-mono-num" [title]="schedule.combined">
                  <strong class="schedule-time">{{ schedule.time }} {{ schedule.tzAbbr }}</strong>
                  <span class="schedule-date">{{ schedule.date }}</span>
                </div>
              </td>
              <td class="cell-status">
                <span class="mobile-cell-label" aria-hidden="true">Estado</span>
                <emx-status [status]="event.status" />
              </td>
              @if (detailLinks()) {
                <td class="cell-action">
                  <a class="text-link" routerLink="/productions" [queryParams]="{ productionId: event.id }"
                    [attr.aria-label]="'Ver detalle: ' + event.name">Ver detalle</a>
                </td>
              } @else if (selectable()) {
                <td class="cell-action">
                  <button
                    type="button"
                    emxButton
                    [variant]="selectedId() === event.id ? 'primary' : 'secondary'"
                    size="small"
                    class="row-select-btn"
                    [class.active]="selectedId() === event.id"
                    [attr.aria-pressed]="selectedId() === event.id"
                    [attr.aria-label]="(selectedId() === event.id ? 'Producción seleccionada: ' : actionLabel() + ': ') + event.name"
                    (click)="onButtonSelect(event, $event)"
                  >
                    <span>{{ selectedId() === event.id ? 'Seleccionada' : actionLabel() }}</span>
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
      border-collapse: collapse;
    }
    .col-production { width: 36%; }
    .col-location { width: 26%; }
    .col-schedule { width: 22%; }
    .col-status { width: 16%; }
    .data-table.production-table.is-selectable .col-production { width: 33%; }
    .data-table.production-table.is-selectable .col-location { width: 23%; }
    .data-table.production-table.is-selectable .col-schedule { width: 20%; }
    .data-table.production-table.is-selectable .col-status { width: 12%; }
    .data-table.production-table.is-selectable .col-action { width: 12%; }

    .data-table.production-table thead tr {
      height: 38px;
      background: #FAFAFB;
      border-bottom: 1px solid #F1F5F9;
    }
    .data-table.production-table th {
      padding: 8px 18px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
      font-size: 12px;
      line-height: 16px;
      font-weight: 600;
      letter-spacing: normal;
      text-transform: none;
      color: #64748B;
      border-bottom: 1px solid #F1F5F9;
      text-align: left;
    }
    .data-table.production-table th:first-child {
      padding-left: 24px;
    }
    .data-table.production-table th:last-child {
      padding-right: 24px;
    }
    .data-table.production-table tbody tr {
      min-height: 52px;
      height: 52px;
      border-bottom: 1px solid #F1F5F9;
      transition: background-color var(--dur-tactile, 140ms) var(--ease-tactile, cubic-bezier(0.23, 1, 0.32, 1));
    }
    .data-table.production-table td {
      padding: 10px 18px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
      font-size: 13px;
      line-height: 18px;
      font-weight: 500;
      color: #0F172A;
      border-bottom: 1px solid #F1F5F9;
      vertical-align: middle;
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
    }
    .data-table.production-table td:first-child {
      padding-left: 24px;
    }
    .data-table.production-table td:last-child {
      padding-right: 24px;
    }
    .data-table.production-table tbody tr:hover {
      background-color: #F8FAFC;
    }
    .th-action,
    .cell-action {
      text-align: right;
      white-space: nowrap;
    }
    .event-cell {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .cal-date-tile {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #FFFFFF;
      border: none;
      box-shadow: var(--shadow-button, 0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.08));
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .cal-month-strip {
      width: 100%;
      height: 15px;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cal-day-num {
      width: 100%;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      line-height: 1;
    }
    .event-monogram {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #EFF6FF;
      color: #2563EB;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .event-info {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .event-name {
      font-size: 13.5px;
      line-height: 19px;
      font-weight: 600;
      color: #111827;
      overflow-wrap: anywhere;
    }
    .cell-meta-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #64748B;
    }
    .id-tag {
      display: inline-flex;
      align-items: center;
      gap: 1.5px;
      height: 19px;
      padding: 0 6px;
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "SF Pro Text", monospace;
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
      color: #334155;
      background: rgba(15, 23, 42, 0.045);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 1px 1px 0 rgba(15, 23, 42, 0.02);
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum";
      letter-spacing: -0.01em;
      user-select: none;
      vertical-align: middle;
      transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
    }
    .id-tag .id-hash {
      color: #94A3B8;
      font-weight: 400;
      font-size: 10px;
    }
    .id-tag:hover {
      background: rgba(15, 23, 42, 0.08);
      border-color: rgba(15, 23, 42, 0.14);
      color: #0F172A;
    }
    .id-tag:hover .id-hash {
      color: #64748B;
    }
    .tenant-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #64748B;
    }
    .cell-meta {
      font-size: 12px;
      line-height: 16px;
      color: #6B7280;
    }
    .cell-location-wrap {
      display: flex;
      align-items: flex-start;
      gap: 7px;
    }
    .location-pin-icon {
      color: #94A3B8;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .venue-text {
      color: #1E293B;
      font-weight: 500;
      font-size: 13px;
      line-height: 19px;
      overflow-wrap: anywhere;
    }
    .cell-schedule {
      font-variant-numeric: tabular-nums;
      vertical-align: middle;
    }
    .schedule-time-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .schedule-time {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.2;
    }
    .schedule-date {
      font-weight: 500;
      color: #64748B;
      font-size: 11.5px;
      line-height: 1.3;
    }
    .row-selectable {
      cursor: pointer;
    }
    .row-selected {
      background-color: #F4F7FF !important;
    }
    .row-selected td:first-child {
      box-shadow: inset 3px 0 0 #2563EB;
    }
    .row-select-btn {
      flex-shrink: 0;
    }

    /* Dark Pro 3D Mode Calibrations */
    :host-context([data-theme="dark"]) .data-table.production-table thead tr,
    :host-context(.dark) .data-table.production-table thead tr {
      background: #121319;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    :host-context([data-theme="dark"]) .data-table.production-table th,
    :host-context(.dark) .data-table.production-table th {
      color: #64748B;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    :host-context([data-theme="dark"]) .data-table.production-table tbody tr,
    :host-context(.dark) .data-table.production-table tbody tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    :host-context([data-theme="dark"]) .data-table.production-table tbody tr:hover,
    :host-context(.dark) .data-table.production-table tbody tr:hover {
      background-color: #1C1D27;
    }
    :host-context([data-theme="dark"]) .data-table.production-table td,
    :host-context(.dark) .data-table.production-table td {
      color: #F1F5F9;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    :host-context([data-theme="dark"]) .cal-date-tile,
    :host-context(.dark) .cal-date-tile {
      background: #1A1C26;
      border-color: rgba(255, 255, 255, 0.1);
    }
    :host-context([data-theme="dark"]) .cal-day-num,
    :host-context(.dark) .cal-day-num {
      color: #F1F5F9;
    }
    :host-context([data-theme="dark"]) .event-name,
    :host-context(.dark) .event-name {
      color: #F1F5F9;
    }
    :host-context([data-theme="dark"]) .venue-text,
    :host-context(.dark) .venue-text {
      color: #CBD5E1;
    }
    :host-context([data-theme="dark"]) .schedule-time,
    :host-context(.dark) .schedule-time {
      color: #F1F5F9;
    }
    :host-context([data-theme="dark"]) .schedule-date,
    :host-context(.dark) .schedule-date {
      color: #94A3B8;
    }
    :host-context([data-theme="dark"]) .id-tag,
    :host-context(.dark) .id-tag {
      background: rgba(255, 255, 255, 0.06);
      color: #E2E8F0;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: none;
    }
    :host-context([data-theme="dark"]) .id-tag .id-hash,
    :host-context(.dark) .id-tag .id-hash {
      color: #64748B;
    }
    :host-context([data-theme="dark"]) .id-tag:hover,
    :host-context(.dark) .id-tag:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
    }
    :host-context([data-theme="dark"]) .id-tag:hover .id-hash,
    :host-context(.dark) .id-tag:hover .id-hash {
      color: #94A3B8;
    }
    :host-context([data-theme="dark"]) .tenant-badge,
    :host-context(.dark) .tenant-badge {
      color: #94A3B8;
    }
    :host-context([data-theme="dark"]) .location-pin-icon,
    :host-context(.dark) .location-pin-icon {
      stroke: #64748B;
    }
    :host-context([data-theme="dark"]) .row-selected,
    :host-context(.dark) .row-selected {
      background-color: rgba(37, 99, 235, 0.14) !important;
    }
    :host-context([data-theme="dark"]) .row-selected td:first-child,
    :host-context(.dark) .row-selected td:first-child {
      box-shadow: inset 3px 0 0 #38BDF8;
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
        gap: 10px 14px;
        padding: 14px 16px;
        border-bottom: 1px solid #EEEFF2;
        height: auto;
        min-height: 0;
      }
      .data-table.production-table tbody tr:last-child {
        border-bottom: 0;
      }
      .data-table.production-table td {
        display: block;
        padding: 0;
        border: 0;
        min-width: 0;
        height: auto;
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
        padding-top: 6px;
      }
      .row-select-btn {
        width: 100%;
        min-height: 36px;
        height: 36px;
      }
      .mobile-cell-label {
        display: block;
        font-size: 11px;
        color: #888888;
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
  readonly actionLabel = input('Gestionar');
  readonly detailLinks = input(false);
  readonly selectProduction = output<ProductionViewModel>();

  organizerLabel(event: ProductionViewModel): string {
    return formatOrganizerDisplayLabel(
      event.organizerId,
      event.organizerDisplayName,
      event.organizerResolutionSource,
    );
  }

  formatSchedule(iso: string | null | undefined): ScheduledAtChile {
    return formatScheduledAtChile(iso);
  }

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
