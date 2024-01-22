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
  @Output() btn1Clicked = new EventEmitter();
  @Input({ required: true }) processing!: WritableSignal<boolean>;
  @Input() buttonsToShow: 'two' | 'three' = 'three';

  @Input() btn1Text = 'SAVE';
  @Input() btn1Icon: IconName = 'arrow-down-tray';
  @Input() btn2Text = 'SAVE & ADD MORE';

  protected form!: FormGroup;
  constructor(
    private rootFormGroup: FormGroupDirective,
    private router: Router,
    private route: ActivatedRoute,
  ) {}
  private stay = false;
  ngOnInit() {
    this.form = this.rootFormGroup.control;
  }

  cancel() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  stayOrCancel() {
    console.log(this.form.controls);
    if (this.stay) {
      this.form.reset();
      console.log('reset');
    } else {
      this.cancel();
    }
  }

  handleBtn1Clicked() {
    console.log('clicked');
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  handleBtn2Clicked() {
    this.stay = true;
    this.handleBtn1Clicked();
  }
}
