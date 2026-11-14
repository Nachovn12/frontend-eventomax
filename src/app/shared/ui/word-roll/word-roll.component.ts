import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  Renderer2,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

interface LetterNode {
  el: HTMLElement;
  s: SpringState;
}

interface WordInstance {
  el: HTMLElement;
  letters: LetterNode[];
  out: boolean;
}

function createSpring(x: number, k: number, c: number): SpringState {
  return { x, v: 0, t: x, k, c };
}

function stepSpring(s: SpringState, dt: number): void {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isSettled(s: SpringState): boolean {
  return Math.abs(s.x - s.t) < 0.0005 && Math.abs(s.v) < 0.0005;
}

/**
 * Interactive spring-driven Word Roll headline component ported from DesignBookmark's
 * Word Roll study with exact stiffness/damping physics (width: 320/30, letters: 420/26).
 */
@Component({
  selector: 'emx-word-roll',
  standalone: true,
  template: `
    <span
      class="emx-roll"
      role="button"
      tabindex="0"
      [attr.aria-label]="accessibleLabel()"
      (click)="next()"
      (keydown)="onKeydown($event)"
    >
      <span class="emx-roll-lead" aria-hidden="true">{{ lead() }}</span>
      <span #slotRef class="emx-roll-slot" aria-hidden="true"></span>
      <span class="emx-roll-sr">{{ accessibleLabel() }}</span>
    </span>
  `,
  styleUrl: './word-roll.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WordRollComponent implements AfterViewInit, OnDestroy {
  private readonly renderer = inject(Renderer2);
  private readonly slotRef = viewChild<ElementRef<HTMLElement>>('slotRef');

  readonly lead = input<string>('De la planificación al');
  readonly words = input<readonly string[]>([
    'montaje final.',
    'despacho técnico.',
    'control en vivo.',
    'cierre auditado.',
  ]);
  readonly intervalSeconds = input<number>(2.4);
  readonly widthStiffness = input<number>(320);
  readonly widthDamping = input<number>(30);
  readonly charStiffness = input<number>(420);
  readonly charDamping = input<number>(26);

  readonly wordChange = output<string>();

  readonly activeIndex = signal<number>(0);
  readonly currentWord = computed(() => {
    const list = this.words();
    if (!list.length) {
      return '';
    }
    return list[this.activeIndex() % list.length];
  });
  readonly accessibleLabel = computed(() => {
    const prefix = this.lead().trim();
    const word = this.currentWord().trim();
    return prefix ? `${prefix} ${word}` : word;
  });

  private liveWords: WordInstance[] = [];
  private widthSpring: SpringState = createSpring(0, 320, 30);
  private hasMeasuredWidth = false;
  private cycleTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduledTimers = new Set<ReturnType<typeof setTimeout>>();
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private destroyed = false;
  private initialized = false;
  private reducedMotion = false;

  constructor() {
    effect(() => {
      const list = this.words();
      if (!this.initialized || !list.length) {
        return;
      }
      this.activeIndex.set(0);
      this.resetLiveWords();
      this.showWord(list[0], true);
      this.scheduleCycle();
    });
  }

  ngAfterViewInit(): void {
    this.initialized = true;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const list = this.words();
    if (list.length > 0) {
      this.showWord(list[0], true);
      this.scheduleCycle();
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (this.destroyed || this.liveWords.length === 0) {
          return;
        }
        const active = this.liveWords[this.liveWords.length - 1];
        const measured = active.el.offsetWidth;
        if (measured > 0) {
          this.hasMeasuredWidth = true;
          this.widthSpring.t = measured;
          this.ensureAnimating();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearCycleTimer();
    this.clearScheduledTimers();
    this.stopAnimationLoop();
    this.resetLiveWords();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.next();
    }
  }

  next(): void {
    const list = this.words();
    if (list.length <= 1) {
      return;
    }
    const nextIdx = (this.activeIndex() + 1) % list.length;
    this.activeIndex.set(nextIdx);
    const nextWord = list[nextIdx];
    this.showWord(nextWord, false);
    this.wordChange.emit(nextWord);
    this.scheduleCycle();
  }

  private effectiveDamping(stiffness: number, damping: number): number {
    return this.reducedMotion ? 2 * Math.sqrt(stiffness) : damping;
  }

  private scheduleCycle(): void {
    this.clearCycleTimer();
    if (this.destroyed || this.words().length <= 1) {
      return;
    }
    this.cycleTimer = setTimeout(() => {
      this.next();
    }, this.intervalSeconds() * 1000);
  }

  private after(seconds: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.scheduledTimers.delete(timer);
      if (!this.destroyed) {
        fn();
      }
    }, Math.round(seconds * 1000));
    this.scheduledTimers.add(timer);
  }

  private clearCycleTimer(): void {
    if (this.cycleTimer !== null) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  private clearScheduledTimers(): void {
    for (const t of this.scheduledTimers) {
      clearTimeout(t);
    }
    this.scheduledTimers.clear();
  }

  private resetLiveWords(): void {
    for (const word of this.liveWords) {
      word.el.remove();
    }
    this.liveWords = [];
  }

  private buildWordNode(wordText: string): WordInstance | null {
    const slot = this.slotRef()?.nativeElement;
    if (!slot) {
      return null;
    }
    const wordEl = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(wordEl, 'emx-roll-word');

    const k = this.charStiffness();
    const c = this.effectiveDamping(k, this.charDamping());

    const letters: LetterNode[] = [...wordText].map((ch) => {
      const charEl = this.renderer.createElement('span') as HTMLElement;
      this.renderer.addClass(charEl, 'emx-roll-ch');
      charEl.textContent = ch;
      this.renderer.appendChild(wordEl, charEl);
      return { el: charEl, s: createSpring(1, k, c) };
    });

    this.renderer.appendChild(slot, wordEl);
    return { el: wordEl, letters, out: false };
  }

  private showWord(wordText: string, first: boolean): void {
    const slot = this.slotRef()?.nativeElement;
    if (!slot) {
      return;
    }

    const wk = this.widthStiffness();
    this.widthSpring.k = wk;
    this.widthSpring.c = this.effectiveDamping(wk, this.widthDamping());

    // Roll existing word out upward letter-by-letter (k * 0.022s stagger)
    for (const existing of this.liveWords) {
      if (existing.out) {
        continue;
      }
      existing.out = true;
      if (this.reducedMotion) {
        existing.el.remove();
        this.liveWords = this.liveWords.filter((item) => item !== existing);
      } else {
        existing.letters.forEach((letter, idx) => {
          this.after(idx * 0.022, () => {
            letter.s.t = -1;
            this.ensureAnimating();
          });
        });
        this.after(1, () => {
          existing.el.remove();
          this.liveWords = this.liveWords.filter((item) => item !== existing);
        });
      }
    }

    const nextInstance = this.buildWordNode(wordText);
    if (!nextInstance) {
      return;
    }

    nextInstance.letters.forEach((letter, idx) => {
      if (first || this.reducedMotion) {
        letter.s.x = 0;
        letter.s.t = 0;
        letter.s.v = 0;
      } else {
        this.after(0.06 + idx * 0.028, () => {
          letter.s.t = 0;
          this.ensureAnimating();
        });
      }
    });

    this.liveWords.push(nextInstance);

    const measuredWidth = nextInstance.el.offsetWidth;
    if (measuredWidth > 0) {
      this.hasMeasuredWidth = true;
      this.widthSpring.t = measuredWidth;
      if (first || this.reducedMotion) {
        this.widthSpring.x = measuredWidth;
        this.widthSpring.v = 0;
      }
    }

    this.renderFrame();
    if (!first && !this.reducedMotion) {
      this.ensureAnimating();
    }
  }

  private ensureAnimating(): void {
    if (this.destroyed || this.rafId !== null || typeof requestAnimationFrame === 'undefined') {
      return;
    }
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stopAnimationLoop(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private readonly tick = (now: number): void => {
    this.rafId = null;
    if (this.destroyed) {
      return;
    }

    const dt = Math.min((now - this.lastTimestamp) / 1000, 1 / 30);
    this.lastTimestamp = now;

    // 4 integration sub-steps per frame matching Motion.loop stability
    const subSteps = 4;
    const subDt = dt / subSteps;
    for (let stepIdx = 0; stepIdx < subSteps; stepIdx++) {
      stepSpring(this.widthSpring, subDt);
      for (const w of this.liveWords) {
        for (const letter of w.letters) {
          stepSpring(letter.s, subDt);
        }
      }
    }

    this.renderFrame();

    const widthMoving = !isSettled(this.widthSpring);
    const anyLetterMoving = this.liveWords.some((w) =>
      w.letters.some((l) => !isSettled(l.s))
    );

    if (widthMoving || anyLetterMoving) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.widthSpring.x = this.widthSpring.t;
      this.widthSpring.v = 0;
      for (const w of this.liveWords) {
        for (const letter of w.letters) {
          letter.s.x = letter.s.t;
          letter.s.v = 0;
        }
      }
      this.renderFrame();
    }
  };

  private renderFrame(): void {
    const slot = this.slotRef()?.nativeElement;
    if (!slot) {
      return;
    }

    if (this.hasMeasuredWidth && this.widthSpring.x > 0) {
      slot.style.width = `${this.widthSpring.x}px`;
    } else {
      const active = this.liveWords[this.liveWords.length - 1];
      if (active) {
        slot.style.position = 'relative';
      }
    }

    for (const w of this.liveWords) {
      for (const letter of w.letters) {
        const y = this.reducedMotion ? 0 : letter.s.x;
        letter.el.style.transform = `translateY(${y * 105}%)`;
        letter.el.style.opacity = String(clamp(1 - Math.abs(y) * 0.9, 0, 1));
      }
    }
  }
}
