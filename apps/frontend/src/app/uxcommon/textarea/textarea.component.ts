import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, input } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '@services/alert.service';

@Component({
  selector: 'pc-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
})
export class TextareaComponent implements OnInit {
  public control = input.required<string>();
  public disabled = input<boolean>(false);
  public placeholder = input<string>('');

  @Output() public valueChange = new EventEmitter<string>();

  protected form!: FormGroup;

  constructor(
    private rootFormGroup: FormGroupDirective,
    private alertSvc: AlertService,
  ) {}

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
