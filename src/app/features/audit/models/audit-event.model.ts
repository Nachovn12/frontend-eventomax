/** Read-only REST contract defined by ms-eventomax-audit (EMX-69). */
export interface AuditEvent {
  readonly eventId: string;
  readonly actor: string | null;
  readonly type: string;
  /** ISO local without offset; backend contract interprets this value in UTC. */
  readonly timestamp: string;
  /** JSON-encoded string, not a nested object. */
  readonly details: string;
  readonly traceId: string | null;
  readonly correlationId: string | null;
}

export interface AuditTimelineFilters {
  readonly actor?: string;
  readonly type?: string;
  /** ISO local without offset, interpreted as UTC by Audit backend. */
  readonly from?: string;
  readonly to?: string;
  readonly page?: number;
  readonly size?: number;
}
