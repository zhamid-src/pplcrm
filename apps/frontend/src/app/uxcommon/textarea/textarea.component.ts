import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  @Input({ required: true }) public control!: string;
  @Input() public disabled: boolean = false;
  @Input() public placeholder: string = '';

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
    return this.form.get(this.control)?.value;
  }

  protected handleKeyup() {
    this.valueChange?.emit(this.getControlValue());
  }
}
