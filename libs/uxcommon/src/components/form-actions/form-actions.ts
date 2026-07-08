import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { merge } from 'rxjs';

@Component({
  selector: 'pc-form-actions',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './form-actions.html',
})
export class FormActions implements OnInit {
  private readonly rootFormGroup = inject(FormGroupDirective, { optional: true });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private stay = false;

  protected form?: FormGroup;

  public signalForm = input<any>();

  public disabled = input<boolean>(false);

  /**
   * §4 "Save never disables": when true, the primary button stays enabled
   * regardless of validity/dirtiness (only `isLoading`/`disabled` gate it). The
   * consuming form is expected to guide on click (markAsTouched + focus the
   * first invalid field) rather than block via a dead button.
   */
  public saveAlwaysEnabled = input<boolean>(false);

  public showDelete = input<boolean>(false);

  public deleteText = input<string>('Delete');

  public readonly deleteClicked = output<void>();

  public readonly btn1Clicked = output<() => void>();

  public btn1Icon = input<PcIconNameType>('save');

  public btn1Text = input<string>('Save');

  public btn2Text = input<string>('Save & add more');

  public buttonsToShow = input<'two' | 'three'>('three');

  public isLoading = input.required<boolean>();

  protected get isSaveDisabled(): boolean {
    if (this.isLoading()) return true;
    if (this.disabled()) return true;
    // Save never disables on validity/dirtiness — the form guides on click.
    if (this.saveAlwaysEnabled()) return false;
    const sigF = this.signalForm();
    if (sigF) {
      return sigF().invalid() || !sigF().dirty();
    }
    if (this.form) {
      return this.form.invalid || !this.form.dirty;
    }
    return false;
  }

  public cancel() {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  public handleDeleteClicked() {
    this.deleteClicked.emit();
  }

  public handleBtn1Clicked() {
    this.stay = false;
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  public handleBtn2Clicked() {
    this.stay = true;
    this.btn1Clicked.emit(this.stayOrCancel);
  }

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
