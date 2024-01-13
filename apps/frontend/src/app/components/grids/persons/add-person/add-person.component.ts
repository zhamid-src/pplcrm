import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { PersonsGridService } from '@services/grid/persons-grid.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pplcrm-add-person',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconsComponent],
  templateUrl: './add-person.component.html',
  styleUrl: './add-person.component.scss',
})
export class AddPersonComponent {
  protected form = this.fb.group({
    first_name: [''],
    middle_name: [''],
    last_name: [''],
    email: ['', [Validators.email]],
    email2: ['', Validators.email],
    home_phone: ['', Validators.pattern('[- +()0-9]+')],
    mobile: ['', Validators.pattern('[- +()0-9]+')],
    notes: [''],
    description: [''],
  });
  protected processing = signal(false);

  constructor(
    private fb: FormBuilder,
    private personSvc: PersonsGridService,
    private alertSvc: AlertService,
    private router: Router,
  ) {}

  protected async add(addMore: boolean = false) {
    this.processing.set(false);
    const formObj = this.form.getRawValue() as UpdatePersonsType;
    await this.personSvc
      .add(formObj)
      .then(() => this.alertSvc.showSuccess('Person added successfully.'))
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.processing.set(false));
  }
  protected cancel() {
    // TODO: create URL tree
    this.router.navigate(['/console/people']);
  }
}
