import { Component, EventEmitter, OnInit, Output, input, inject } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '@uxcommon/alert-service';

@Component({
  selector: 'pc-textarea',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './textarea.html',
})
export class TextArea implements OnInit {
  private rootFormGroup = inject(FormGroupDirective);
  private alertSvc = inject(AlertService);

  public control = input.required<string>();
  public disabled = input<boolean>(false);
  public placeholder = input<string>('');

  @Output() public valueChange = new EventEmitter<string>();

  protected form!: FormGroup;

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
  }

  protected getControlValue() {
    return this.form.get(this.control())?.value;
  }

  protected handleKeyup() {
    this.valueChange?.emit(this.getControlValue());
  }
}
