import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  DestroyRef,
  computed,
  ViewEncapsulation
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly broadcastService = inject(MsalBroadcastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  /** True while MSAL interaction is in progress. */
  readonly isLoading = signal(true);

  /** Error message to display. */
  readonly errorMsg = signal<string | null>(null);

  /** Carousel state */
  readonly slides = [
    {
      image: '/branding/eventomax/login/eventomax-login-produccion.jpg',
      eyebrow: 'PRODUCCIÓN',
      title: 'Del plan al montaje,\ntodo coordinado.',
      description: 'Centraliza la preparación, el montaje y la ejecución\ndesde una sola operación.'
    },
    {
      image: '/branding/eventomax/login/eventomax-login-recursos.jpg',
      eyebrow: 'RECURSOS',
      title: 'Todo el equipamiento,\nuna sola coordinación.',
      description: 'Gestiona equipos, inventario y cuadrillas\nalrededor de una misma operación.'
    },
    {
      image: '/branding/eventomax/login/eventomax-login-trazabilidad.jpg',
      eyebrow: 'TRAZABILIDAD',
      title: 'Visibilidad operativa\nde principio a fin.',
      description: 'Conserva el contexto de cada cambio y etapa\nhasta el cierre de la producción.'
    }
  ];

  readonly activeSlide = signal(0);
  readonly currentSlide = computed(() => this.slides[this.activeSlide()]);
  ngOnInit(): void {
    this.broadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => !!msg.error),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.errorMsg.set('No pudimos iniciar sesión. Verifica tu cuenta corporativa e inténtalo nuevamente.');
      });

    this.broadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isLoading.set(false);
        if (this.auth.isAuthenticated()) {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  onLogin(): void {
    this.errorMsg.set(null);
    this.auth.login();
  }

  goToSlide(index: number): void {
    this.activeSlide.set(index);
  }
}
