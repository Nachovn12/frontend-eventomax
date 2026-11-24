import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface FooterEnterpriseLink {
  readonly label: string;
  readonly href?: string;
  readonly routerLink?: string;
  readonly sectionId?: string;
  readonly tabIndex?: number;
  readonly external?: boolean;
}

export interface FooterEnterpriseColumn {
  readonly title: string;
  readonly links: readonly FooterEnterpriseLink[];
}

export interface FooterEnterpriseSocial {
  readonly id: 'github' | 'portal' | 'demo';
  readonly label: string;
  readonly href?: string;
  readonly routerLink?: string;
  readonly sectionId?: string;
  readonly external?: boolean;
}

export const EVENTOMAX_FOOTER_COLUMNS: readonly FooterEnterpriseColumn[] = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Demostración en Vivo', sectionId: 'simulador' },
      { label: 'Panel Principal', sectionId: 'simulador', tabIndex: 0 },
      { label: 'Métricas Operativas', sectionId: 'impacto' },
      { label: 'Arquitectura Cloud Native', sectionId: 'arquitectura' },
    ],
  },
  {
    title: 'Operaciones',
    links: [
      { label: 'Agenda de Producciones', routerLink: '/productions' },
      { label: 'Catálogo de Servicios', routerLink: '/catalog' },
      { label: 'Inventario Técnico', routerLink: '/catalog' },
      { label: 'Hoja de Ruta Cuadrilla', sectionId: 'simulador', tabIndex: 2 },
    ],
  },
  {
    title: 'Observabilidad',
    links: [
      { label: 'Reportes y KPIs', routerLink: '/reports' },
      { label: 'Auditoría Kafka 24/7', routerLink: '/audit' },
      { label: 'Despacho RabbitMQ 4.3', sectionId: 'arquitectura' },
      { label: 'Disponibilidad 99.9%', sectionId: 'impacto' },
    ],
  },
  {
    title: 'Seguridad & IDaaS',
    links: [
      { label: 'Portal Microsoft Entra ID', routerLink: '/login' },
      { label: 'Autenticación Federada SSO', routerLink: '/login' },
      { label: 'Control de Acceso RBAC', sectionId: 'arquitectura' },
      { label: 'Arquitectura Zero Trust', sectionId: 'arquitectura' },
    ],
  },
  {
    title: 'Ingeniería',
    links: [
      {
        label: 'GitHub frontend-eventomax',
        href: 'https://github.com/Nachovn12/frontend-eventomax',
        external: true,
      },
      { label: 'Angular 22 & Signals', sectionId: 'arquitectura' },
      { label: 'Spring Boot 4.1 & Java 25', sectionId: 'arquitectura' },
      { label: 'PostgreSQL & Outbox', sectionId: 'arquitectura' },
    ],
  },
];

export const EVENTOMAX_FOOTER_SOCIALS: readonly FooterEnterpriseSocial[] = [
  {
    id: 'github',
    label: 'Repositorio GitHub de EventoMax',
    href: 'https://github.com/Nachovn12/frontend-eventomax',
    external: true,
  },
  {
    id: 'portal',
    label: 'Ingresar al Portal Microsoft Entra ID',
    routerLink: '/login',
  },
  {
    id: 'demo',
    label: 'Ir a la demostración en vivo',
    sectionId: 'simulador',
  },
];

export const EVENTOMAX_FOOTER_BOTTOM_LINKS: readonly FooterEnterpriseLink[] = [
  { label: 'ISO/IEC 27001', sectionId: 'arquitectura' },
  { label: 'Microsoft Entra ID IDaaS', routerLink: '/login' },
  { label: 'Zero Trust Architecture', sectionId: 'arquitectura' },
  { label: 'Portal Operativo', routerLink: '/login' },
];

/**
 * Enterprise-grade three-tier footer inspired by Ruixen UI Footer Enterprise.
 * Uses whisper-quiet typography, 1px hairline separators, and a responsive 5-column grid.
 */
@Component({
  selector: 'emx-footer-enterprise',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="fe-root" aria-label="Pie de página corporativo">
      <div class="fe-container">
        <!-- Tier 1: Brand lockup + subtle utility/social icons -->
        <div class="fe-top">
          <div class="fe-brand-col">
            <a routerLink="/portal" class="fe-brand-lockup" aria-label="EventoMax Inicio">
              <img
                [src]="brandMarkUrl()"
                alt=""
                aria-hidden="true"
                class="fe-brand-mark"
              />
              <span class="fe-brand-name">{{ brandName() }}</span>
            </a>
            <p class="fe-description">{{ description() }}</p>
          </div>

          @if (socials().length > 0) {
            <div class="fe-socials" aria-label="Accesos rápidos de plataforma">
              @for (item of socials(); track item.id) {
                @if (item.external && item.href) {
                  <a
                    [href]="item.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    [attr.aria-label]="item.label"
                    [title]="item.label"
                    class="fe-social-link"
                  >
                    @switch (item.id) {
                      @case ('github') {
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
                          />
                        </svg>
                      }
                      @case ('portal') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      }
                      @case ('demo') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      }
                    }
                  </a>
                } @else if (item.routerLink) {
                  <a
                    [routerLink]="item.routerLink"
                    [attr.aria-label]="item.label"
                    [title]="item.label"
                    class="fe-social-link"
                  >
                    @switch (item.id) {
                      @case ('portal') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      }
                      @case ('demo') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      }
                      @default {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      }
                    }
                  </a>
                } @else if (item.sectionId) {
                  <a
                    [href]="'#' + item.sectionId"
                    (click)="onSectionClick(item.sectionId, undefined, $event)"
                    [attr.aria-label]="item.label"
                    [title]="item.label"
                    class="fe-social-link"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </a>
                }
              }
            </div>
          }
        </div>

        <!-- Divider 1 -->
        <div class="fe-divider fe-divider-mid" aria-hidden="true"></div>

        <!-- Tier 2: Wide 5-column navigation grid -->
        <nav class="fe-grid" aria-label="Mapa de navegación corporativo">
          @for (col of columns(); track col.title) {
            <div class="fe-col">
              <p class="fe-col-title">{{ col.title }}</p>
              <ul class="fe-link-list">
                @for (link of col.links; track link.label) {
                  <li>
                    @if (link.external && link.href) {
                      <a
                        [href]="link.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fe-link fe-link-external"
                      >
                        <span>{{ link.label }}</span>
                        <svg class="fe-ext-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M5 11L11 5" />
                          <path d="M6 5h5v5" />
                        </svg>
                      </a>
                    } @else if (link.routerLink) {
                      <a [routerLink]="link.routerLink" class="fe-link">
                        {{ link.label }}
                      </a>
                    } @else if (link.sectionId) {
                      <a
                        [href]="'#' + link.sectionId"
                        (click)="onSectionClick(link.sectionId, link.tabIndex, $event)"
                        class="fe-link"
                      >
                        {{ link.label }}
                      </a>
                    } @else {
                      <a [href]="link.href || '#'" class="fe-link">
                        {{ link.label }}
                      </a>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </nav>

        <!-- Divider 2 -->
        <div class="fe-divider fe-divider-bot" aria-hidden="true"></div>

        <!-- Tier 3: Copyright + enterprise compliance links -->
        <div class="fe-bottom">
          <p class="fe-copyright">{{ copyright() }}</p>

          @if (bottomLinks().length > 0) {
            <div class="fe-bottom-links" aria-label="Cumplimiento y enlaces legales">
              @for (link of bottomLinks(); track link.label) {
                @if (link.routerLink) {
                  <a [routerLink]="link.routerLink" class="fe-bottom-link">
                    {{ link.label }}
                  </a>
                } @else if (link.sectionId) {
                  <a
                    [href]="'#' + link.sectionId"
                    (click)="onSectionClick(link.sectionId, link.tabIndex, $event)"
                    class="fe-bottom-link"
                  >
                    {{ link.label }}
                  </a>
                } @else {
                  <a [href]="link.href || '#'" class="fe-bottom-link">
                    {{ link.label }}
                  </a>
                }
              }
            </div>
          }
        </div>
      </div>
    </footer>
  `,
  styleUrl: './footer-enterprise.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterEnterpriseComponent {
  readonly brandName = input<string>('EventoMax');
  readonly brandMarkUrl = input<string>('/branding/eventomax/symbols/eventomax-symbol-dark.svg');
  readonly description = input<string>(
    'Plataforma unificada para producción técnica, inventario audiovisual, despacho de cuadrillas y trazabilidad en tiempo real.'
  );
  readonly columns = input<readonly FooterEnterpriseColumn[]>(EVENTOMAX_FOOTER_COLUMNS);
  readonly socials = input<readonly FooterEnterpriseSocial[]>(EVENTOMAX_FOOTER_SOCIALS);
  readonly bottomLinks = input<readonly FooterEnterpriseLink[]>(EVENTOMAX_FOOTER_BOTTOM_LINKS);
  readonly copyright = input<string>(
    '© 2026 EventoMax. Plataforma de Producción y Montaje de Eventos. Todos los derechos reservados.'
  );

  readonly sectionNavigate = output<{ sectionId: string; tabIndex?: number; event: Event }>();

  onSectionClick(sectionId: string, tabIndex: number | undefined, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.sectionNavigate.emit({ sectionId, tabIndex, event });
  }
}
