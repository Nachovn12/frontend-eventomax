import { Injectable, computed, signal } from '@angular/core';
import { Production } from '../models/production.model';

@Injectable({ providedIn: 'root' })
export class ActiveProductionsStore {
  /**
   * Tracks the count of active productions (non-closed, non-cancelled).
   * Null indicates data has not yet been loaded.
   */
  private readonly _activeCount = signal<number | null>(null);

  /**
   * Read-only signal exposing the current active productions count.
   */
  readonly activeCount = this._activeCount.asReadonly();

  /**
   * Formatted badge for the navigation sidebar according to Apple HIG.
   * If there are no active productions (count <= 0) or data is null, returns undefined
   * to keep the sidebar interface clean and silent without zero-badges.
   */
  readonly sidebarBadge = computed<string | undefined>(() => {
    const count = this._activeCount();
    if (count === null || count <= 0) {
      return undefined;
    }
    return String(count);
  });

  /**
   * Updates the store by filtering out closed and cancelled productions.
   */
  updateFromProductions(productions: readonly Production[] | readonly { status: string }[]): void {
    const count = productions.filter(
      (p) => !['CERRADO', 'CANCELADO'].includes(p.status)
    ).length;
    this._activeCount.set(count);
  }

  /**
   * Explicitly sets the active count.
   */
  setActiveCount(count: number | null): void {
    this._activeCount.set(count);
  }
}
