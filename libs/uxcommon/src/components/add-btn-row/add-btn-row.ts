import { Component, OnInit, inject, input, output, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';

@Component({
  selector: 'pc-add-btn-row',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './add-btn-row.html',
})
export class AddBtnRow implements OnInit {
  private readonly rootFormGroup = inject(FormGroupDirective, { optional: true });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private stay = false;

  protected form?: FormGroup;

  /**
   * The optional Signal-based form state.
   * If provided, button disabling and reset behavior will use this form state.
   */
  public signalForm = input<any>();

  /**
   * Emits when the first button (e.g., SAVE or SAVE & ADD MORE) is clicked.
   * The parent component should decide what to do next based on whether
   * the stay flag is set.
   */
  public readonly btn1Clicked = output<() => void>();

  /**
   * The icon to show on the first button.
   * Default is 'arrow-down-tray'.
   */
  public btn1Icon = input<PcIconNameType>('arrow-down-tray');

  /**
   * The text to show on the first button.
   * Default is 'SAVE'.
   */
  public btn1Text = input<string>('SAVE');

  /**
   * The text to show on the second button (optional).
   * Default is 'SAVE & ADD MORE'.
   */
  public btn2Text = input<string>('SAVE & ADD MORE');

  /**
   * Whether to show two or three buttons.
   * Default is 'three'.
   */
  public buttonsToShow = input<'two' | 'three'>('three');

  /**
   * A required flag indicating whether the form is currently loading.
   * Used to disable buttons and prevent double submissions.
   */
  public isLoading = input.required<boolean>();

  /**
   * Returns true if the save actions should be disabled.
   */
  protected get isSaveDisabled(): boolean {
    if (this.isLoading()) return true;
    const sigF = this.signalForm();
    if (sigF) {
      return sigF().invalid() || !sigF().dirty();
    }
    if (this.form) {
      return this.form.invalid || !this.form.dirty;
    }
    return false;
  }

  /**
   * Navigates the user back to the previous route.
   * Used by the cancel button.
   */
  public cancel() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  /**
   * Emits the btn1Clicked event with a callback.
   * The parent can then decide to call the callback (usually stayOrCancel).
   */
  public handleBtn1Clicked() {
    this.stay = false;
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  /**
   * Called when the second button is clicked (SAVE & ADD MORE).
   * Sets the stay flag and reuses the handler for btn1.
   */
  public handleBtn2Clicked() {
    this.stay = true;
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  /**
   * Initializes the component by linking to the parent form group.
   */
  public ngOnInit() {
    this.form = this.rootFormGroup?.control;
    if (this.form) {
      merge(this.form.valueChanges, this.form.statusChanges)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.cdr.markForCheck();
        });
    }
  }

  /**
   * This callback is passed to the parent via btn1Clicked.
   * If stay is true, resets the form to allow adding another.
   * Otherwise, navigates away.
   */
  public stayOrCancel = () => {
    if (this.stay) {
      const sigF = this.signalForm();
      if (sigF) {
        sigF().reset();
      } else if (this.form) {
        this.form.reset();
      }
    } else {
      this.cancel();
    }
  };
}
