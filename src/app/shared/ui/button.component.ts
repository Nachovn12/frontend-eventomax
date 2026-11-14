import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'medium' | 'small' | 'xs';

/**
 * Apple Design System Button (1:1 Board UI Figma specification).
 * Variants: Primary (Cobalt Blue tactile), Secondary (Apple White/Stroke),
 * Ghost (Minimalist), Danger (Urgent destructive).
 * Sizes: Medium (36px, r=10px), Small (32px, r=8px), Xs (24px, r=6px).
 */
@Component({
  selector: 'emx-button',
  standalone: true,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [attr.aria-disabled]="disabled() ? 'true' : null"
      [attr.aria-label]="ariaLabel() || null"
      [class]="computedClasses()"
    >
      <ng-content select="[leadingIcon]" />
      <span class="emx-btn__label">
        <ng-content />
      </span>
      <ng-content select="[trailingIcon]" />
    </button>
  `,
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('medium');
  readonly iconOnly = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly computedClasses = computed(() => {
    const sizeMap: Record<ButtonSize, string> = {
      medium: 'emx-btn--md',
      small: 'emx-btn--sm',
      xs: 'emx-btn--xs',
    };
    const variantMap: Record<ButtonVariant, string> = {
      primary: 'emx-btn--primary',
      secondary: 'emx-btn--secondary',
      ghost: 'emx-btn--ghost',
      danger: 'emx-btn--danger',
    };
    return [
      'emx-btn',
      variantMap[this.variant()],
      sizeMap[this.size()],
      this.iconOnly() ? 'emx-btn--icon-only' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });
}

/**
 * Directive variant to attach Apple Design System button styling directly
 * to native <button emxButton [variant]="'secondary'"> or <a emxButtonLink> elements.
 */
@Directive({
  selector: 'button[emxButton], a[emxButtonLink]',
  standalone: true,
  host: {
    '[class.emx-btn]': 'true',
    '[class.emx-btn--primary]': 'variant() === "primary"',
    '[class.emx-btn--secondary]': 'variant() === "secondary"',
    '[class.emx-btn--ghost]': 'variant() === "ghost"',
    '[class.emx-btn--danger]': 'variant() === "danger"',
    '[class.emx-btn--md]': 'size() === "medium"',
    '[class.emx-btn--sm]': 'size() === "small"',
    '[class.emx-btn--xs]': 'size() === "xs"',
    '[class.emx-btn--icon-only]': 'iconOnly()',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('medium');
  readonly iconOnly = input<boolean>(false);
}
