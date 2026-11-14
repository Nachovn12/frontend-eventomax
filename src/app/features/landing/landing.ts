import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  signal,
  computed,
  OnInit,
  OnDestroy
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterEnterpriseComponent } from '../../shared/ui/footer-enterprise/footer-enterprise.component';
import { WordRollComponent } from '../../shared/ui/word-roll/word-roll.component';
import { MarkerTextComponent, MarkDirective } from '../../shared/ui/marker-text/marker-text.component';
import {
  LucideArrowRight,
  LucideArrowUp,
  LucideCheck,
  LucidePlay,
  LucidePause,
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucideVideo,
  LucideInfo,
  LucideRotateCw
} from '@lucide/angular';

export interface StorylaneHotspot {
  readonly id: string;
  readonly top: string;
  readonly left: string;
  readonly stepNumber: number;
  readonly tag: string;
  readonly title: string;
  readonly description: string;
  readonly metric: string;
}

export interface StorylaneStep {
  readonly id: string;
  readonly badge: string;
  readonly tabLabel: string;
  readonly routePath: string;
  readonly title: string;
  readonly subtitle: string;
  readonly toast: string;
  readonly image: string;
  readonly imageAlt: string;
  readonly hotspots: readonly StorylaneHotspot[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    FooterEnterpriseComponent,
    WordRollComponent,
    MarkerTextComponent,
    MarkDirective,
    LucideArrowRight,
    LucideArrowUp,
    LucideCheck,
    LucidePlay,
    LucidePause,
    LucideChevronLeft,
    LucideChevronRight,
    LucideEye,
    LucideVideo,
    LucideInfo,
    LucideRotateCw
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class Landing implements OnInit, OnDestroy {
  /** Active simulator step index (0 to 3) */
  readonly activeTab = signal<number>(0);

  /** Display mode: interactive guided walkthrough or recorded video */
  readonly displayMode = signal<'interactive' | 'video'>('interactive');

  /** Whether the interactive hotspots/beacons are visible on the real UI */
  readonly showHotspots = signal<boolean>(true);

  /** Currently hovered or selected hotspot id */
  readonly activeHotspot = signal<string | null>(null);

  /** Whether the interactive walkthrough is automatically advancing */
  readonly isPlaying = signal<boolean>(true);

  /** Scroll progress for ScrollOverHero (0 to 1) */
  readonly scrollProgress = signal<number>(0);

  /** Whether the floating Scroll-to-Top control should be visible */
  readonly showScrollTop = signal<boolean>(false);

  /** Real operational phases cycled in the Hero Word Roll headline */
  readonly heroRollWords: readonly string[] = [
    'montaje final.',
    'despacho técnico.',
    'control en vivo.',
    'cierre auditado.',
  ];

  private timerRef: ReturnType<typeof setInterval> | null = null;
  private scrollObserver: IntersectionObserver | null = null;
  private scrollHandler: (() => void) | null = null;

  readonly heroContentTransform = computed(() => {
    const p = this.scrollProgress();
    const translateY = -p * 48;
    const scale = 1 - p * 0.05;
    return `translate3d(0, ${translateY}px, 0) scale(${scale})`;
  });

  readonly heroContentOpacity = computed(() => {
    const p = this.scrollProgress();
    return Math.max(0, 1 - p * 1.45);
  });

  readonly steps: readonly StorylaneStep[] = [
    {
      id: 'dashboard',
      badge: 'PASO 1 · MONITOREO',
      tabLabel: 'Panel Principal',
      routePath: '/dashboard',
      title: 'Panel de Control y Monitoreo en Tiempo Real',
      subtitle: 'Supervisión operativa centralizada: estado de producciones, transiciones de montaje y métricas clave sin demoras.',
      toast: 'Panel operativo sincronizado: producciones y métricas actualizadas en tiempo real.',
      image: '/branding/eventomax/demo/demo-real-1-dashboard.png',
      imageAlt: 'Panel de control real de EventoMax con telemetría en tiempo real y métricas operativas',
      hotspots: [
        {
          id: 'k1',
          top: '59%',
          left: '72%',
          stepNumber: 1,
          tag: 'FLUJO EN TIEMPO REAL',
          title: 'Flujo de Eventos en Tiempo Real',
          description: 'Transmisión continua de actualizaciones operacionales. Cada cambio de estado se refleja de inmediato en pantalla sin demoras ni recargas.',
          metric: 'Actualizaciones continuas'
        },
        {
          id: 'k2',
          top: '82%',
          left: '28%',
          stepNumber: 2,
          tag: 'RED MULTISEDE',
          title: 'Monitoreo Centralizado de Producciones',
          description: 'Producciones activas coordinadas en tiempo real. Ciclo de vida completo trazado desde la solicitud hasta el cierre sin usar planillas Excel.',
          metric: '4 registradas · 3 activas'
        }
      ]
    },
    {
      id: 'productions',
      badge: 'PASO 2 · PRODUCCIÓN',
      tabLabel: 'Gestión de Producciones',
      routePath: '/productions',
      title: 'Agenda de Producciones y Control de Etapas',
      subtitle: 'Control de etapas con validación rigurosa: no es posible pasar a montaje sin confirmación previa y reserva garantizada de equipos.',
      toast: 'Reserva completada: equipamiento de sonido e iluminación reservado para Cumbre Sur #003.',
      image: '/branding/eventomax/demo/demo-real-2-productions.png',
      imageAlt: 'Módulo de producciones real de EventoMax con agenda y control de estados',
      hotspots: [
        {
          id: 'p1',
          top: '73%',
          left: '32%',
          stepNumber: 1,
          tag: 'RESERVA GARANTIZADA',
          title: 'Bloqueo Atómico de Inventario AV',
          description: 'Al confirmar el evento, los equipos audiovisuales requeridos quedan reservados de forma exclusiva, impidiendo duplicidades o sobrearriendos.',
          metric: '14 equipos reservados'
        },
        {
          id: 'p2',
          top: '73%',
          left: '79.5%',
          stepNumber: 2,
          tag: 'CONTROL DE MONTAJE',
          title: 'Control de Transición a EN_MONTAJE',
          description: 'El sistema valida los permisos y la autorización del productor responsable antes de habilitar el montaje en terreno.',
          metric: 'Validación de acceso rigurosa'
        }
      ]
    },
    {
      id: 'crewticket',
      badge: 'PASO 3 · DESPACHO',
      tabLabel: 'Hoja de Ruta Cuadrilla',
      routePath: '/productions/3/ticket',
      title: 'Orden de Trabajo y Despacho a Terreno',
      subtitle: 'Despacho digital directo a los técnicos: adiós a los grupos de WhatsApp y con instrucciones claras de llegada al recinto.',
      toast: 'Orden de trabajo enviada a los especialistas vía despacho digital (q.cmd.crew).',
      image: '/branding/eventomax/demo/demo-real-3-crewticket.png',
      imageAlt: 'Modal real de Orden de Trabajo Técnica con asignación de cuadrilla, horas y reservas',
      hotspots: [
        {
          id: 'c1',
          top: '19%',
          left: '64%',
          stepNumber: 1,
          tag: 'DESPACHO DIGITAL',
          title: 'Despacho Asíncrono de Cuadrilla',
          description: 'Envío de asignaciones mediante la cola de trabajo q.cmd.crew. Cada técnico recibe su orden con citación horaria y rampa de descarga.',
          metric: 'ACK 100% (4 notificados)'
        },
        {
          id: 'c2',
          top: '57%',
          left: '60%',
          stepNumber: 2,
          tag: 'EQUIPAMIENTO & DIRECTIVA',
          title: 'Equipos Verificados y Directiva de Terreno',
          description: 'Consola DiGiCo Quantum 338, 16 cajas Meyer Sound LYON-M y Robe MegaPointe. Directiva de descarga en rampa norte con opción de impresión oficial.',
          metric: '4 partidas técnicas'
        }
      ]
    },
    {
      id: 'audit',
      badge: 'PASO 4 · AUDITORÍA',
      tabLabel: 'Historial y Auditoría',
      routePath: '/audit',
      title: 'Historial Transparente de Operaciones',
      subtitle: 'Registro permanente y transparente de cada acción: quién solicitó, quién confirmó, quién montó y quién cerró cada evento.',
      toast: 'Evento ProductionStatusChanged auditado en línea de tiempo con identificador correlacionado.',
      image: '/branding/eventomax/demo/demo-real-4-audit.png',
      imageAlt: 'Módulo de auditoría real de EventoMax con timeline de eventos inmutables',
      hotspots: [
        {
          id: 'a1',
          top: '71%',
          left: '44%',
          stepNumber: 1,
          tag: 'REGISTRO AUDITADO',
          title: 'Evento ProductionStatusChanged Auditado',
          description: 'Registro de auditoría que identifica al usuario responsable (ignacio.valeria@eventomax.cl), fecha exacta y detalles del cambio de estado.',
          metric: 'Trace: tr-c4b9-8f2e-71a0'
        },
        {
          id: 'a2',
          top: '24%',
          left: '72%',
          stepNumber: 2,
          tag: 'TRANSPARENCIA TOTAL',
          title: 'Historial Inmutable de Solo Lectura',
          description: 'Los auditores y organizadores disponen de un respaldo confiable para actas de entrega, informes de cierre y facturación.',
          metric: '100% trazabilidad'
        }
      ]
    }
  ];

  readonly currentStep = computed(() => this.steps[this.activeTab()]);

  ngOnInit(): void {
    this.startAutoplay();
    this.initScrollReveal();
    this.initScrollOverHero();
    if (typeof window !== 'undefined' && window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      if (targetId) {
        setTimeout(() => this.scrollToSection(targetId), 150);
      }
    }
  }

  private initScrollOverHero(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const updateProgress = () => {
      const scrollDist = Math.max(0, window.scrollY);
      const overlapDistance = 380;
      const p = Math.max(0, Math.min(1, scrollDist / overlapDistance));
      this.scrollProgress.set(p);
      this.showScrollTop.set(scrollDist > 480);
    };
    this.scrollHandler = updateProgress;
    window.addEventListener('scroll', updateProgress, { passive: true });
    // Initial evaluation
    updateProgress();
  }

  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const element = document.getElementById(sectionId);
    if (element) {
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/#${sectionId}`);
      }
    }
  }

  onFooterSectionNavigate(payload: { sectionId: string; tabIndex?: number; event: Event }): void {
    if (payload.tabIndex !== undefined) {
      this.setTab(payload.tabIndex);
    }
    this.scrollToSection(payload.sectionId, payload.event);
  }

  scrollToTop(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    }
    if (window.location.hash) {
      window.history.replaceState(null, '', '/');
    }
  }

  refreshSimulatorView(): void {
    this.activeHotspot.set(null);
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
    if (this.scrollHandler && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }

  private initScrollReveal(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      if (typeof document !== 'undefined') {
        const targets = document.querySelectorAll('.reveal-on-scroll');
        targets.forEach((el) => el.classList.add('is-visible'));
      }
      return;
    }
    setTimeout(() => {
      const targets = document.querySelectorAll('.reveal-on-scroll');
      if (!targets.length) {
        return;
      }
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              this.scrollObserver?.unobserve(entry.target);
            }
          }
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -40px 0px'
        }
      );
      targets.forEach((el) => this.scrollObserver?.observe(el));
    }, 120);
  }

  setTab(index: number): void {
    this.activeTab.set(index);
    this.activeHotspot.set(null);
  }

  nextTab(): void {
    this.activeTab.update((prev) => (prev + 1) % this.steps.length);
    this.activeHotspot.set(null);
  }

  prevTab(): void {
    this.activeTab.update((prev) => (prev - 1 + this.steps.length) % this.steps.length);
    this.activeHotspot.set(null);
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.stopAutoplay();
      this.isPlaying.set(false);
    } else {
      this.isPlaying.set(true);
      this.startAutoplay();
    }
  }

  setMode(mode: 'interactive' | 'video'): void {
    this.displayMode.set(mode);
    if (mode === 'video') {
      this.stopAutoplay();
      this.isPlaying.set(false);
    }
  }

  toggleHotspots(): void {
    this.showHotspots.update((v) => !v);
  }

  selectHotspot(id: string): void {
    this.activeHotspot.update((curr) => (curr === id ? null : id));
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    this.timerRef = setInterval(() => {
      this.activeTab.update((prev) => (prev + 1) % this.steps.length);
    }, 5500);
  }

  private stopAutoplay(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }
}
