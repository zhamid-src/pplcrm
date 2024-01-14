import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, WritableSignal } from '@angular/core';
import { FormGroup, FormGroupDirective, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'pc-add-btn-row',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './AddBtnRow.component.html',
  styleUrl: './AddBtnRow.component.scss',
})
export class AddBtnRowComponent implements OnInit {
  @Output() add = new EventEmitter();
  @Input({ required: true }) processing!: WritableSignal<boolean>;

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
    if (this.stay) {
      this.form.reset();
    } else {
      this.cancel();
    }
  }

  emitAdd(addMore: boolean = false) {
    this.add.emit(this.stayOrCancel);
    this.stay = addMore;
  }
}
