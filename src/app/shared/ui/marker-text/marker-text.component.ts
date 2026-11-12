import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  InjectionToken,
  OnDestroy,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export type MarkType = 'highlight' | 'underline' | 'circle' | 'box' | 'strike';

type Pt = [number, number];

interface LineRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface MarkEntry {
  el: HTMLElement;
  type: MarkType;
  color?: string;
  strokeWidth?: number;
}

export interface MarkerStroke {
  readonly key: string;
  readonly shape: string;
  readonly pen: string;
  readonly penWidth: number;
  readonly length: number;
  readonly color: string;
  readonly under: boolean;
  readonly alpha: number;
  readonly delay: number;
  readonly duration: number;
}

interface MarkerRegistry {
  register(id: string, entry: MarkEntry): () => void;
}

const MARKER_REGISTRY = new InjectionToken<MarkerRegistry>('EMX_MARKER_REGISTRY');

const DEFAULT_COLOR: Record<MarkType, string> = {
  highlight: '#93c5fd',
  underline: '#2563eb',
  circle: '#2563eb',
  box: '#16a34a',
  strike: '#dc2626',
};

const PEN_SPEED = 0.9;
const HIGHLIGHT_SPEED = 1.15;
const MIN_MS = 260;
const MAX_MS = 820;
const LINE_GAP = 60;
const PEN_EASE = 'cubic-bezier(0.45, 0.05, 0.25, 1)';
const MASK_SPAN = 20_000;

let nextMaskId = 1;

function seededRandom(seed: number): () => number {
  let n = seed;
  return () => {
    n += 1;
    const x = Math.sin(n * 12.9898 + seed * 78.233) * 43_758.5453;
    return x - Math.floor(x);
  };
}

function hashText(text: string): number {
  let h = 7;
  for (const ch of text) {
    h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 1_000_003;
  }
  return h;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

function polyline(points: Pt[]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${r1(x)} ${r1(y)}`)
    .join('');
}

function lengthOf(points: Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1]
    );
  }
  return total;
}

function outline(points: Pt[], widths: number[]): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const last = points.length - 1;
  for (let i = 0; i <= last; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(last, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const half = widths[i] / 2;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    left.push([points[i][0] + nx, points[i][1] + ny]);
    right.push([points[i][0] - nx, points[i][1] - ny]);
  }
  const endCap = r1(widths[last] / 2);
  const startCap = r1(widths[0] / 2);
  const back = right.reverse();
  return `${polyline(left)}A${endCap} ${endCap} 0 0 0 ${r1(back[0][0])} ${r1(
    back[0][1]
  )}${polyline(back).replace('M', 'L')}A${startCap} ${startCap} 0 0 0 ${r1(
    left[0][0]
  )} ${r1(left[0][1])}Z`;
}

function pressure(t: number, base: number): number {
  const land = Math.min(1, t / 0.1);
  const lift = Math.min(1, (1 - t) / 0.18);
  return (
    base * (0.45 + 0.55 * Math.sin((land * Math.PI) / 2)) * (0.55 + 0.45 * lift)
  );
}

function wobble(rand: () => number, amp: number): (t: number) => number {
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const f1 = 1 + rand() * 1.5;
  const f2 = 3 + rand() * 3;
  return (t: number) =>
    amp *
    (0.7 * Math.sin(t * f1 * Math.PI + p1) +
      0.3 * Math.sin(t * f2 * Math.PI + p2));
}

function sample(count: number, at: (t: number) => Pt): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= count; i++) {
    points.push(at(i / count));
  }
  return points;
}

function penStroke(
  points: Pt[],
  width: number,
  key: string,
  color: string
): Omit<MarkerStroke, 'delay' | 'duration'> {
  const widths = points.map((_, i) => pressure(i / (points.length - 1), width));
  return {
    key,
    shape: outline(points, widths),
    pen: polyline(points),
    penWidth: width * 4,
    length: lengthOf(points),
    color,
    under: false,
    alpha: 1,
  };
}

function circleStroke(
  box: LineRect,
  rand: () => number,
  width: number,
  key: string,
  color: string
): Omit<MarkerStroke, 'delay' | 'duration'> {
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const rx = (box.right - box.left) / 2 + 8;
  const ry = (box.bottom - box.top) / 2 + 4;
  const tilt = ((rand() - 0.5) * 6 * Math.PI) / 180;
  const start = -Math.PI * (0.62 + rand() * 0.12);
  const sweep = Math.PI * 2 + 0.45 + rand() * 0.2;
  const drift = 0.05 + rand() * 0.04;
  const wave = wobble(rand, 0.025);
  const steps = Math.max(48, Math.round((rx + ry) / 3));
  const points = sample(steps, (t) => {
    const a = start + sweep * t;
    const grow = 1 - drift / 2 + drift * t + wave(t);
    const x = Math.cos(a) * rx * grow;
    const y = Math.sin(a) * ry * grow;
    return [
      cx + x * Math.cos(tilt) - y * Math.sin(tilt),
      cy + x * Math.sin(tilt) + y * Math.cos(tilt),
    ];
  });
  return penStroke(points, width, key, color);
}

function boxStroke(
  box: LineRect,
  rand: () => number,
  width: number,
  key: string,
  color: string
): Omit<MarkerStroke, 'delay' | 'duration'> {
  const padX = 5;
  const padY = 3;
  const corners: Pt[] = [
    [box.left - padX - rand() * 2, box.top - padY + (rand() - 0.5) * 2],
    [box.right + padX + rand() * 2, box.top - padY + (rand() - 0.5) * 2],
    [box.right + padX + (rand() - 0.5) * 2, box.bottom + padY + rand() * 2],
    [box.left - padX + (rand() - 0.5) * 2, box.bottom + padY + rand() * 2],
  ];
  const points: Pt[] = [];
  for (let side = 0; side < 4; side++) {
    const a = corners[side];
    const b = corners[(side + 1) % 4];
    const bow = (rand() - 0.5) * 3;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const steps = Math.max(6, Math.round(len / 8));
    for (let s = side === 0 ? 0 : 1; s <= steps; s++) {
      const t = s / steps;
      const lift = Math.sin(t * Math.PI) * bow;
      points.push([
        a[0] + (b[0] - a[0]) * t + nx * lift,
        a[1] + (b[1] - a[1]) * t + ny * lift,
      ]);
    }
  }
  const first = corners[0];
  const second = corners[1];
  const over = 14 / Math.hypot(second[0] - first[0], second[1] - first[1]);
  points.push([
    first[0] + (second[0] - first[0]) * over,
    first[1] + (second[1] - first[1]) * over + 1.5,
  ]);
  return penStroke(points, width, key, color);
}

function strokesFor(
  entry: MarkEntry,
  lines: LineRect[],
  seed: number,
  index: number
): Omit<MarkerStroke, 'delay' | 'duration'>[] {
  const rand = seededRandom(seed);
  const color = entry.color ?? DEFAULT_COLOR[entry.type];
  const lineHeight = Math.max(12, lines[0].bottom - lines[0].top);
  const width =
    entry.strokeWidth ?? Math.min(4.2, Math.max(1.8, lineHeight * 0.08));

  if (entry.type === 'highlight') {
    return lines.map((line, i) => {
      const h = Math.max(12, line.bottom - line.top);
      const topWave = wobble(rand, 0.8);
      const bottomWave = wobble(rand, 0.8);
      const chisel = h * 0.18;
      const tilt = (rand() - 0.5) * Math.min(2.4, h * 0.06);
      const x0 = line.left - 4;
      const x1 = line.right + 4;
      const y0 = line.top + h * 0.1;
      const y1 = line.bottom - h * 0.04;
      const steps = Math.max(6, Math.round((x1 - x0) / 14));
      const edge = (y: number, wave: (t: number) => number, dx: number) =>
        sample(steps, (t) => [
          x0 + dx + (x1 - x0) * t,
          y + wave(t) + tilt * (t - 0.5),
        ]);
      const upper = edge(y0, topWave, chisel * 0.5);
      const lower = edge(y1, bottomWave, -chisel * 0.5).reverse();
      const mid = (y0 + y1) / 2;
      const pen: Pt[] = [
        [x0 - chisel, mid],
        [x1 + chisel, mid + tilt * 0.5],
      ];
      return {
        key: `${index}-${i}`,
        shape: `${polyline(upper)}${polyline(lower).replace('M', 'L')}Z`,
        pen: polyline(pen),
        penWidth: h * 1.8,
        length: lengthOf(pen),
        color,
        under: true,
        alpha: 0.34,
      };
    });
  }

  if (entry.type === 'underline' || entry.type === 'strike') {
    return lines.map((line, i) => {
      const h = Math.max(12, line.bottom - line.top);
      const bow = (rand() - 0.5) * 2.2;
      const slope = (rand() - 0.5) * (entry.type === 'strike' ? 3 : 1.8);
      const wave = wobble(rand, 0.45);
      const x0 = line.left - 1;
      const x1 = line.right + 1;
      const y =
        entry.type === 'strike'
          ? line.top + h * 0.56
          : line.bottom + Math.max(1, h * 0.04);
      const steps = Math.max(8, Math.round((x1 - x0) / 6));
      const points = sample(steps, (t) => [
        x0 + (x1 - x0) * t,
        y + Math.sin(t * Math.PI) * bow + slope * (t - 0.5) + wave(t),
      ]);
      return penStroke(points, width, `${index}-${i}`, color);
    });
  }

  return lines.map((line, i) =>
    entry.type === 'circle'
      ? circleStroke(line, rand, width, `${index}-${i}`, color)
      : boxStroke(line, rand, width, `${index}-${i}`, color)
  );
}

function measureLineRects(el: HTMLElement, rootRect: DOMRect): LineRect[] {
  if (typeof document === 'undefined' || typeof document.createRange !== 'function') {
    return [];
  }
  const range = document.createRange();
  let clientRects: DOMRect[] = [];
  if (typeof range.getClientRects === 'function') {
    range.selectNodeContents(el);
    clientRects = Array.from(range.getClientRects()).filter(
      (r) => r.width > 0.5 && r.height > 0.5
    );
  }
  if (clientRects.length === 0) {
    const fallback = el.getBoundingClientRect();
    if (fallback.width > 0.5 && fallback.height > 0.5) {
      return [
        {
          left: fallback.left - rootRect.left,
          top: fallback.top - rootRect.top,
          right: fallback.right - rootRect.left,
          bottom: fallback.bottom - rootRect.top,
        },
      ];
    }
    return [];
  }

  const lines: LineRect[] = [];
  for (const r of clientRects) {
    const rel: LineRect = {
      left: r.left - rootRect.left,
      top: r.top - rootRect.top,
      right: r.right - rootRect.left,
      bottom: r.bottom - rootRect.top,
    };
    const prev = lines[lines.length - 1];
    if (prev && Math.abs(rel.top - prev.top) < (prev.bottom - prev.top) * 0.5) {
      prev.left = Math.min(prev.left, rel.left);
      prev.top = Math.min(prev.top, rel.top);
      prev.right = Math.max(prev.right, rel.right);
      prev.bottom = Math.max(prev.bottom, rel.bottom);
    } else {
      lines.push(rel);
    }
  }
  return lines;
}

@Directive({
  selector: '[emxMark]',
  standalone: true,
  host: {
    class: 'emx-mark-phrase',
    '[attr.data-mark]': 'emxMark()',
  },
})
export class MarkDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly registry = inject(MARKER_REGISTRY, { optional: true });
  private readonly entryId = `emx-mark-${nextMaskId++}`;
  private unregister: (() => void) | null = null;

  readonly emxMark = input<MarkType>('highlight');
  readonly markColor = input<string | undefined>(undefined);
  readonly markStrokeWidth = input<number | undefined>(undefined);

  constructor() {
    effect(() => {
      const type = this.emxMark();
      const color = this.markColor();
      const strokeWidth = this.markStrokeWidth();
      if (!this.unregister) {
        return;
      }
      this.unregister();
      this.unregister =
        this.registry?.register(this.entryId, {
          el: this.el.nativeElement,
          type,
          color,
          strokeWidth,
        }) ?? null;
    });
  }

  ngAfterViewInit(): void {
    this.unregister =
      this.registry?.register(this.entryId, {
        el: this.el.nativeElement,
        type: this.emxMark(),
        color: this.markColor(),
        strokeWidth: this.markStrokeWidth(),
      }) ?? null;
  }

  ngOnDestroy(): void {
    this.unregister?.();
    this.unregister = null;
  }
}

/**
 * Scroll-triggered SVG ink & highlighter emphasis ported from Kokonut UI's MarkerText.
 * Draws organic variable-pressure strokes once when scrolled into view (`threshold: 0.6`).
 */
@Component({
  selector: 'emx-marker-text',
  standalone: true,
  providers: [
    {
      provide: MARKER_REGISTRY,
      useExisting: MarkerTextComponent,
    },
  ],
  template: `
    <span #rootRef class="emx-marker-root">
      <svg
        aria-hidden="true"
        class="emx-marker-svg emx-marker-under"
        width="1"
        height="1"
      >
        @for (s of underStrokes(); track s.key) {
          <g>
            <mask
              [attr.id]="maskId + '-' + s.key"
              maskUnits="userSpaceOnUse"
              [attr.x]="-maskSpan / 2"
              [attr.y]="-maskSpan / 2"
              [attr.width]="maskSpan"
              [attr.height]="maskSpan"
            >
              <path
                [attr.d]="s.pen"
                fill="none"
                stroke="white"
                [attr.stroke-dasharray]="s.length + 1"
                [attr.stroke-dashoffset]="armed() ? 0 : s.length + 1"
                stroke-linecap="butt"
                stroke-linejoin="round"
                [attr.stroke-width]="s.penWidth"
                [style.transition]="transitionFor(s)"
              />
            </mask>
            <path
              [attr.d]="s.shape"
              [attr.fill]="s.color"
              [attr.fill-opacity]="s.alpha"
              [attr.mask]="'url(#' + maskId + '-' + s.key + ')'"
            />
          </g>
        }
      </svg>

      <ng-content />

      <svg
        aria-hidden="true"
        class="emx-marker-svg emx-marker-over"
        width="1"
        height="1"
      >
        @for (s of overStrokes(); track s.key) {
          <g>
            <mask
              [attr.id]="maskId + '-' + s.key"
              maskUnits="userSpaceOnUse"
              [attr.x]="-maskSpan / 2"
              [attr.y]="-maskSpan / 2"
              [attr.width]="maskSpan"
              [attr.height]="maskSpan"
            >
              <path
                [attr.d]="s.pen"
                fill="none"
                stroke="white"
                [attr.stroke-dasharray]="s.length + 1"
                [attr.stroke-dashoffset]="armed() ? 0 : s.length + 1"
                stroke-linecap="round"
                stroke-linejoin="round"
                [attr.stroke-width]="s.penWidth"
                [style.transition]="transitionFor(s)"
              />
            </mask>
            <path
              [attr.d]="s.shape"
              [attr.fill]="s.color"
              [attr.fill-opacity]="s.alpha"
              [attr.mask]="'url(#' + maskId + '-' + s.key + ')'"
            />
          </g>
        }
      </svg>
    </span>
  `,
  styles: [
    `
      .emx-marker-root {
        position: relative;
        display: inline;
        isolation: isolate;
      }

      .emx-marker-svg {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        overflow: visible;
      }

      .emx-marker-under {
        z-index: -1;
      }

      .emx-marker-over {
        z-index: 1;
      }

      .emx-mark-phrase {
        background: transparent;
        color: inherit;
        text-decoration: none;
      }

      .emx-mark-phrase[data-mark='circle'],
      .emx-mark-phrase[data-mark='box'] {
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MarkerTextComponent
  implements MarkerRegistry, AfterViewInit, OnDestroy
{
  private readonly rootRef = viewChild<ElementRef<HTMLElement>>('rootRef');
  readonly show = input<boolean | undefined>(undefined);
  readonly gap = input<number>(140);
  readonly drawn = output<void>();

  readonly maskId = `emx-marker-mask-${nextMaskId++}`;
  readonly maskSpan = MASK_SPAN;

  readonly strokes = signal<MarkerStroke[]>([]);
  readonly underStrokes = computed(() =>
    this.strokes().filter((s) => s.under)
  );
  readonly overStrokes = computed(() =>
    this.strokes().filter((s) => !s.under)
  );
  readonly seen = signal<boolean>(false);
  readonly armed = signal<boolean>(false);
  readonly reduced = signal<boolean>(false);
  readonly visible = computed(() => {
    const controlled = this.show();
    return controlled !== undefined ? controlled : this.seen();
  });

  private readonly entries = new Map<string, MarkEntry>();
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private raf1: number | null = null;
  private raf2: number | null = null;
  private drawnTimer: ReturnType<typeof setTimeout> | null = null;
  private measureTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      this.cancelRafs();
      if (!isVisible) {
        this.armed.set(false);
        return;
      }
      if (this.reduced() || typeof requestAnimationFrame === 'undefined') {
        this.armed.set(true);
        return;
      }
      this.raf1 = requestAnimationFrame(() => {
        this.raf2 = requestAnimationFrame(() => {
          if (!this.destroyed) {
            this.armed.set(true);
          }
        });
      });
    });

    effect(() => {
      const isArmed = this.armed();
      const list = this.strokes();
      if (this.drawnTimer) {
        clearTimeout(this.drawnTimer);
        this.drawnTimer = null;
      }
      if (!isArmed || list.length === 0) {
        return;
      }
      const totalDuration = list.reduce(
        (maxEnd, s) => Math.max(maxEnd, s.delay + s.duration),
        0
      );
      this.drawnTimer = setTimeout(
        () => {
          if (!this.destroyed) {
            this.drawn.emit();
          }
        },
        this.reduced() ? 0 : totalDuration
      );
    });
  }

  register(id: string, entry: MarkEntry): () => void {
    this.entries.set(id, entry);
    this.scheduleMeasure();
    return () => {
      this.entries.delete(id);
      this.scheduleMeasure();
    };
  }

  transitionFor(stroke: MarkerStroke): string {
    if (!this.armed() || this.reduced()) {
      return 'none';
    }
    return `stroke-dashoffset ${stroke.duration}ms ${PEN_EASE} ${stroke.delay}ms`;
  }

  ngAfterViewInit(): void {
    this.reduced.set(
      typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    const root = this.rootRef()?.nativeElement;
    if (!root) {
      return;
    }

    this.measure();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      const target = root.parentElement ?? root;
      this.resizeObserver.observe(target);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onWindowResize, { passive: true });
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!this.destroyed) {
          this.measure();
        }
      });
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            this.seen.set(true);
            this.intersectionObserver?.disconnect();
            this.intersectionObserver = null;
          }
        },
        { threshold: 0.6 }
      );
      this.intersectionObserver.observe(root);
    } else {
      this.seen.set(true);
    }
  }

  private readonly onWindowResize = (): void => {
    this.scheduleMeasure();
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cancelRafs();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
    }
    if (this.drawnTimer) {
      clearTimeout(this.drawnTimer);
    }
    if (this.measureTimer) {
      clearTimeout(this.measureTimer);
    }
  }

  private scheduleMeasure(): void {
    if (this.destroyed) {
      return;
    }
    if (this.measureTimer) {
      clearTimeout(this.measureTimer);
    }
    this.measureTimer = setTimeout(() => {
      this.measureTimer = null;
      if (!this.destroyed) {
        this.measure();
      }
    }, 0);
  }

  private cancelRafs(): void {
    if (this.raf1 !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.raf1);
      this.raf1 = null;
    }
    if (this.raf2 !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.raf2);
      this.raf2 = null;
    }
  }

  private measure(): void {
    const root = this.rootRef()?.nativeElement;
    if (!root) {
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const sorted = Array.from(this.entries.values()).sort((a, b) => {
      if (a.el === b.el) {
        return 0;
      }
      return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });

    const computedStrokes: MarkerStroke[] = [];
    let cursorDelay = 0;

    sorted.forEach((entry, index) => {
      const lines = measureLineRects(entry.el, rootRect);
      if (lines.length === 0) {
        return;
      }
      const speed = entry.type === 'highlight' ? HIGHLIGHT_SPEED : PEN_SPEED;
      const seed = hashText(`${entry.el.textContent ?? ''}:${entry.type}:${index}`);
      const pieces = strokesFor(entry, lines, seed, index);

      pieces.forEach((piece, lineIdx) => {
        const duration = Math.max(
          MIN_MS,
          Math.min(MAX_MS, Math.round(piece.length / speed))
        );
        computedStrokes.push({
          ...piece,
          delay: cursorDelay,
          duration,
        });
        cursorDelay += duration + (lineIdx < pieces.length - 1 ? LINE_GAP : 0);
      });

      cursorDelay += this.gap();
    });

    this.strokes.set(computedStrokes);
  }
}
