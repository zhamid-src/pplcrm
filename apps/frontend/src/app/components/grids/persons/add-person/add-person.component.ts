import {
  NgxGpAutocompleteModule,
  NgxGpAutocompleteOptions,
} from '@angular-magic/ngx-gp-autocomplete';
import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { PersonsGridService } from '@services/grid/persons-grid.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { InputComponent } from '@uxcommon/input/input.component';

@Component({
  selector: 'pplcrm-add-person',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IconsComponent,
    InputComponent,
    NgxGpAutocompleteModule,
  ],
  templateUrl: './add-person.component.html',
  styleUrl: './add-person.component.scss',
})
export class AddPersonComponent {
  options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  protected phonePattern = '[- +()0-9]+';
  protected form = this.fb.group({
    first_name: [''],
    middle_name: [''],
    last_name: [''],
    email: ['', [Validators.email]],
    email2: ['', Validators.email],
    home_phone: ['', Validators.pattern(this.phonePattern)],
    mobile: ['', Validators.pattern(this.phonePattern)],
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
    console.log(formObj);
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
  handleAddressChange(place: google.maps.places.PlaceResult) {
    if (!place?.address_components?.length) {
      this.alertSvc.showError('Please select the correct address from the list or leave it blank');
      return;
    }
    this.processing.set(true);
    console.log(place);
  }
}
