import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideCheck, LucideCode, LucideCopy } from '@lucide/angular';

export type JsonTokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct' | 'plain';

export interface JsonToken {
  readonly kind: JsonTokenKind;
  readonly text: string;
}

const JSON_TOKEN_REGEX =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}\[\],:])/g;

export function tokenizeJsonSafe(raw: string | null | undefined): {
  readonly isValidJson: boolean;
  readonly formatted: string;
  readonly tokens: readonly JsonToken[];
} {
  if (!raw) {
    return { isValidJson: false, formatted: '', tokens: [] };
  }

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return {
      isValidJson: false,
      formatted: raw,
      tokens: [{ kind: 'plain', text: raw }],
    };
  }

  const tokens: JsonToken[] = [];
  let lastIndex = 0;

  JSON_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSON_TOKEN_REGEX.exec(formatted)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: 'plain', text: formatted.slice(lastIndex, match.index) });
    }
    const lexeme = match[0];
    if (lexeme.startsWith('"')) {
      if (lexeme.endsWith(':')) {
        tokens.push({ kind: 'key', text: lexeme.slice(0, -1) });
        tokens.push({ kind: 'punct', text: ':' });
      } else {
        tokens.push({ kind: 'string', text: lexeme });
      }
    } else if (lexeme === 'true' || lexeme === 'false') {
      tokens.push({ kind: 'boolean', text: lexeme });
    } else if (lexeme === 'null') {
      tokens.push({ kind: 'null', text: lexeme });
    } else if (/^[{}\[\],:]$/.test(lexeme)) {
      tokens.push({ kind: 'punct', text: lexeme });
    } else {
      tokens.push({ kind: 'number', text: lexeme });
    }
    lastIndex = JSON_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < formatted.length) {
    tokens.push({ kind: 'plain', text: formatted.slice(lastIndex) });
  }

  return { isValidJson: true, formatted, tokens };
}

@Component({
  selector: 'emx-audit-json-viewer',
  standalone: true,
  imports: [LucideCode, LucideCopy, LucideCheck],
  templateUrl: './audit-json-viewer.component.html',
  styleUrl: './audit-json-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditJsonViewerComponent {
  readonly payload = input<string | null | undefined>('');
  readonly eventId = input<string>('');

  readonly copied = signal(false);

  readonly parsed = computed(() => tokenizeJsonSafe(this.payload()));

  copyRaw(event: Event): void {
    event.stopPropagation();
    const raw = this.payload();
    if (!raw || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(raw)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      })
      .catch(() => {});
  }
}
