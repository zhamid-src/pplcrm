import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { PasswordCheckerModule } from '@triangular/password-checker';

/**
 * Reusable password input with visibility toggle and optional breach checking.
 */
@Component({
  selector: 'pc-password-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon, PasswordCheckerModule],
  template: `
    <label class="group relative block">
      <pc-icon
        [size]="4"
        class="pointer-events-none absolute left-3 top-1/3 h-1 w-4 -translate-y-1/2 transform text-sm text-gray-300"
        name="lock-closed"
      />

      <input
        class="input-pplcrm pl-11 pr-8 text-sm"
        [type]="getVisibility()"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
        [attr.placeholder]="placeholder()"
        [attr.maxlength]="maxlength()"
        [attr.pwnedPasswordValidator]="pwned() ? '' : null"
      />

      <pc-icon
        [size]="4"
        class="absolute right-3 top-1/3 h-3 w-3 -translate-y-1/2 transform cursor-pointer pr-5 pt-1 text-xs text-gray-500"
        [name]="getVisibilityIcon()"
        (click)="toggleVisibility()"
      />
    </label>
  `,
})
export class PasswordInputComponent {
  protected hidePassword = true;

  public autocomplete = input<string>('new-password');
  public control = input.required<FormControl>();
  public maxlength = input<number>(72);
  public placeholder = input<string>('Enter your password');
  public pwned = input(false);

  /** Returns input type based on visibility state */
  public getVisibility() {
    return this.hidePassword ? 'password' : 'text';
  }

  /** Returns the icon name for the visibility toggle */
  public getVisibilityIcon() {
    return this.hidePassword ? 'eye-slash' : 'eye';
  }

  /** Toggles password visibility */
  public toggleVisibility() {
    this.hidePassword = !this.hidePassword;
  }
}
