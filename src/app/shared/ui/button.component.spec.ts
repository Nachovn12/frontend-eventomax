import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent, ButtonDirective } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent, ButtonDirective],
  template: `
    <emx-button [variant]="'primary'" [size]="'medium'">Confirmar</emx-button>
    <emx-button [variant]="'secondary'" [size]="'small'">Cancelar</emx-button>
    <emx-button [variant]="'danger'" [size]="'xs'" [disabled]="true">Eliminar</emx-button>
    <emx-button [variant]="'ghost'" [iconOnly]="true" ariaLabel="Ver más">
      <span class="icon">★</span>
    </emx-button>
    <button emxButton [variant]="'secondary'" [size]="'small'">Directiva</button>
  `,
})
class TestHostComponent {}

describe('Apple Design System Button (Board UI)', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, ButtonComponent, ButtonDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('renders default primary medium button with Apple tactile classes', () => {
    const primaryBtn = fixture.nativeElement.querySelector('emx-button:nth-of-type(1) button');
    expect(primaryBtn).toBeTruthy();
    expect(primaryBtn.classList.contains('emx-btn')).toBe(true);
    expect(primaryBtn.classList.contains('emx-btn--primary')).toBe(true);
    expect(primaryBtn.classList.contains('emx-btn--md')).toBe(true);
    expect(primaryBtn.textContent.trim()).toBe('Confirmar');
  });

  it('renders secondary small button with Board UI specs', () => {
    const secondaryBtn = fixture.nativeElement.querySelector('emx-button:nth-of-type(2) button');
    expect(secondaryBtn).toBeTruthy();
    expect(secondaryBtn.classList.contains('emx-btn--secondary')).toBe(true);
    expect(secondaryBtn.classList.contains('emx-btn--sm')).toBe(true);
    expect(secondaryBtn.textContent.trim()).toBe('Cancelar');
  });

  it('renders disabled danger xs button with aria-disabled', () => {
    const dangerBtn = fixture.nativeElement.querySelector('emx-button:nth-of-type(3) button');
    expect(dangerBtn).toBeTruthy();
    expect(dangerBtn.classList.contains('emx-btn--danger')).toBe(true);
    expect(dangerBtn.classList.contains('emx-btn--xs')).toBe(true);
    expect(dangerBtn.disabled).toBe(true);
    expect(dangerBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders icon-only ghost button with aria-label', () => {
    const ghostBtn = fixture.nativeElement.querySelector('emx-button:nth-of-type(4) button');
    expect(ghostBtn).toBeTruthy();
    expect(ghostBtn.classList.contains('emx-btn--ghost')).toBe(true);
    expect(ghostBtn.classList.contains('emx-btn--icon-only')).toBe(true);
    expect(ghostBtn.getAttribute('aria-label')).toBe('Ver más');
  });

  it('supports button[emxButton] directive on native elements', () => {
    const nativeBtn = fixture.nativeElement.querySelector('button[emxButton]');
    expect(nativeBtn).toBeTruthy();
    expect(nativeBtn.classList.contains('emx-btn')).toBe(true);
    expect(nativeBtn.classList.contains('emx-btn--secondary')).toBe(true);
    expect(nativeBtn.classList.contains('emx-btn--sm')).toBe(true);
  });
});
