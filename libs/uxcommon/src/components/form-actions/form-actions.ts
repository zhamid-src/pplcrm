import { Component, OnInit, inject, input, output, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  public showDelete = input<boolean>(false);

  public deleteText = input<string>('DELETE');

  public readonly deleteClicked = output<void>();

  public readonly btn1Clicked = output<() => void>();

  public btn1Icon = input<PcIconNameType>('save');

  public btn1Text = input<string>('SAVE');

  public btn2Text = input<string>('SAVE & ADD MORE');

  public buttonsToShow = input<'two' | 'three'>('three');

  public isLoading = input.required<boolean>();

  protected get isSaveDisabled(): boolean {
    if (this.isLoading()) return true;
    if (this.disabled()) return true;
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
    this.router.navigate(['../'], { relativeTo: this.route });
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
