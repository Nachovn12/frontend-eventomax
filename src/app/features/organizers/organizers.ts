import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  LucideSearch,
  LucideCircleCheck,
  LucideCircleAlert,
  LucideUsers,
} from '@lucide/angular';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { OrganizerContact, OrganizerContactRequest } from '../../core/models/production.model';
import { ProductionsDataService } from '../productions/productions-data.service';
import { ButtonDirective } from '../../shared/ui/button.component';

type LookupOutcome =
  | { kind: 'found'; organizerId: string; contact: OrganizerContact }
  | { kind: 'not_found'; organizerId: string }
  | { kind: 'error'; organizerId: string; status: number };

@Component({
  selector: 'app-organizers',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonDirective,
    LucideSearch,
    LucideCircleCheck,
    LucideCircleAlert,
    LucideUsers,
  ],
  templateUrl: './organizers.html',
  styleUrls: ['./organizers.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Organizers {
  private readonly dataService = inject(ProductionsDataService);
  private readonly authz = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canAdmin = computed(
    () => this.authz.hasAnyRole([AppRole.Admin]) && this.authz.hasScope('access_as_user')
  );

  readonly searchOrganizerId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(255)],
  });

  readonly contactForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    contactName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    userOid: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
  });

  readonly activeOrganizerId = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly contact = signal<OrganizerContact | null>(null);
  readonly notFound = signal(false);
  readonly lookupError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);

  private readonly lookupRequests = new Subject<string>();

  constructor() {
    this.lookupRequests
      .pipe(
        switchMap((organizerId) => {
          this.loading.set(true);
          this.activeOrganizerId.set(organizerId);
          this.contact.set(null);
          this.notFound.set(false);
          this.lookupError.set(null);
          this.saveError.set(null);
          this.saveSuccess.set(null);

          return this.dataService.getOrganizerContact(organizerId).pipe(
            switchMap((result) => of<LookupOutcome>({ kind: 'found', organizerId, contact: result })),
            catchError((err: HttpErrorResponse) => {
              if (err.status === 404) {
                return of<LookupOutcome>({ kind: 'not_found', organizerId });
              }
              return of<LookupOutcome>({ kind: 'error', organizerId, status: err.status ?? 0 });
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((outcome) => {
        this.loading.set(false);
        if (outcome.kind === 'found') {
          this.contact.set(outcome.contact);
          this.notFound.set(false);
          this.contactForm.reset({
            email: outcome.contact.email ?? '',
            contactName: outcome.contact.contactName ?? '',
            phone: outcome.contact.phone ?? '',
            userOid: outcome.contact.userOid ?? '',
          });
        } else if (outcome.kind === 'not_found') {
          this.contact.set(null);
          this.notFound.set(true);
          this.contactForm.reset({
            email: '',
            contactName: '',
            phone: '',
            userOid: '',
          });
        } else {
          this.contact.set(null);
          this.notFound.set(false);
          this.lookupError.set(this.mapHttpError(outcome.status, 'lookup'));
        }
      });
  }

  submitLookup(): void {
    if (!this.canAdmin()) return;
    this.searchOrganizerId.markAsTouched();
    const id = this.searchOrganizerId.value.trim();
    if (!id || this.searchOrganizerId.invalid) return;
    this.lookupRequests.next(id);
  }

  submitSave(): void {
    const organizerId = this.activeOrganizerId().trim();
    if (!this.canAdmin() || !organizerId || this.saving()) return;
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid) return;

    const raw = this.contactForm.getRawValue();
    const existingOid = this.contact()?.userOid?.trim() || '';
    const enteredOid = raw.userOid.trim();
    const resolvedOid = enteredOid || existingOid;

    const request: OrganizerContactRequest = {
      email: raw.email.trim(),
      contactName: raw.contactName.trim() || undefined,
      phone: raw.phone.trim() || undefined,
      ...(resolvedOid ? { userOid: resolvedOid } : {}),
    };

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    this.dataService.upsertOrganizerContact(organizerId, request).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.contact.set(saved);
        this.notFound.set(false);
        this.contactForm.reset({
          email: saved.email,
          contactName: saved.contactName ?? '',
          phone: saved.phone ?? '',
          userOid: saved.userOid ?? '',
        });
        this.saveSuccess.set(`Contacto registrado para ${saved.organizerId}: ${saved.email}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(this.mapHttpError(err.status ?? 0, 'save'));
      },
    });
  }

  private mapHttpError(status: number, action: 'lookup' | 'save'): string {
    if (status === 400) {
      return action === 'lookup'
        ? 'El identificador de organizador ingresado no es válido.'
        : 'Revisa el formato del correo electrónico y los datos ingresados.';
    }
    if (status === 401) {
      return 'Sesión expirada o no autenticada. Vuelve a iniciar sesión con Microsoft.';
    }
    if (status === 403) {
      return 'No tienes permisos de Administrador para gestionar este contacto.';
    }
    if (status === 0) {
      return 'No fue posible conectar con el servicio. Verifica tu conexión e intenta nuevamente.';
    }
    return action === 'lookup'
      ? 'No pudimos consultar el contacto del organizador en este momento.'
      : 'No pudimos guardar el contacto del organizador en este momento.';
  }
}
