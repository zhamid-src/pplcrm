import { Component, EventEmitter, OnInit, Output, inject, input } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '@uxcommon/icon';
import { IconName } from '@uxcommon/svg-icons-list';

@Component({
  selector: 'pc-add-btn-row',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './add-btn-row.html',
})
export class AddBtnRow implements OnInit {
  private _rootFormGroup = inject(FormGroupDirective);
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _stay = false;

  protected form!: FormGroup;

  /**
   * Emits when the first button (e.g., SAVE or SAVE & ADD MORE) is clicked.
   * The parent component should decide what to do next based on whether
   * the stay flag is set.
   */
  @Output() public btn1Clicked = new EventEmitter<() => void>();

  /**
   * The icon to show on the first button.
   * Default is 'arrow-down-tray'.
   */
  public btn1Icon = input<IconName>('arrow-down-tray');

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
   * A required flag indicating whether the form is currently processing.
   * Used to disable buttons and prevent double submissions.
   */
  public processing = input.required<boolean>();

  /**
   * Navigates the user back to the previous route.
   * Used by the cancel button.
   */
  public cancel() {
    this._router.navigate(['../'], { relativeTo: this._route });
  }

  /**
   * Emits the btn1Clicked event with a callback.
   * The parent can then decide to call the callback (usually stayOrCancel).
   */
  public handleBtn1Clicked() {
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  /**
   * Called when the second button is clicked (SAVE & ADD MORE).
   * Sets the stay flag and reuses the handler for btn1.
   */
  public handleBtn2Clicked() {
    this._stay = true;
    this.handleBtn1Clicked();
  }

  /**
   * Initializes the component by linking to the parent form group.
   */
  public ngOnInit() {
    this.form = this._rootFormGroup.control;
  }

  /**
   * This callback is passed to the parent via btn1Clicked.
   * If stay is true, resets the form to allow adding another.
   * Otherwise, navigates away.
   */
  public stayOrCancel() {
    this._stay ? this.form.reset() : this.cancel();
  }
}
