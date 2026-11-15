import { merge, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';

export const DEFAULT_POLL_INTERVAL_MS = 30_000;

/**
 * Combines explicit manual refreshes (false = interactive refresh) with periodic
 * background ticks (true = silent refresh every intervalMs).
 */
export function withLivePolling(
  manualTrigger$: Observable<unknown>,
  intervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Observable<boolean> {
  return merge(
    manualTrigger$.pipe(map(() => false)),
    timer(intervalMs, intervalMs).pipe(map(() => true)),
  );
}
