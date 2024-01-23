import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, WritableSignal } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-add-btn-row',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconsComponent],
  templateUrl: './AddBtnRow.component.html',
  styleUrl: './AddBtnRow.component.scss',
})
export class AddBtnRowComponent implements OnInit {
  @Output() public btn1Clicked = new EventEmitter();
  @Input() public btn1Icon: IconName = 'arrow-down-tray';
  @Input() public btn1Text = 'SAVE';
  @Input() public btn2Text = 'SAVE & ADD MORE';
  @Input() public buttonsToShow: 'two' | 'three' = 'three';
  @Input({ required: true }) public processing!: WritableSignal<boolean>;

  protected form!: FormGroup;

  private stay = false;

  constructor(
    private rootFormGroup: FormGroupDirective,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  public ngOnInit() {
    this.form = this.rootFormGroup.control;
  }

  public cancel() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  public handleBtn1Clicked() {
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  public handleBtn2Clicked() {
    this.stay = true;
    this.handleBtn1Clicked();
  }

  public stayOrCancel() {
    this.stay ? this.form.reset() : this.cancel();
  }
}
