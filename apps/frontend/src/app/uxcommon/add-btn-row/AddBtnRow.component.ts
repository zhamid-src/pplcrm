
import { Component, EventEmitter, OnInit, Output, input } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
    selector: 'pc-add-btn-row',
    imports: [ReactiveFormsModule, IconsComponent],
    templateUrl: './AddBtnRow.component.html',
    styleUrl: './AddBtnRow.component.css'
})
export class AddBtnRowComponent implements OnInit {
  @Output() public btn1Clicked = new EventEmitter();
  public btn1Icon = input<IconName>('arrow-down-tray');
  public btn1Text = input<string>('SAVE');
  public btn2Text = input<string>('SAVE & ADD MORE');
  public buttonsToShow = input<'two' | 'three'>('three');
  public processing = input.required<boolean>();

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
