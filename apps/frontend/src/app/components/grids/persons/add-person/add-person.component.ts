import {
  NgxGpAutocompleteModule,
  NgxGpAutocompleteOptions,
} from '@angular-magic/ngx-gp-autocomplete';
import { CommonModule } from '@angular/common';
import { Component, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { PersonsGridService } from '@services/grid/persons-grid.service';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { InputComponent } from '@uxcommon/input/input.component';
import { TagsComponent } from '@uxcommon/tags/tags.component';

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
    AddBtnRowComponent,
    TagsComponent,
  ],
  templateUrl: './add-person.component.html',
  styleUrl: './add-person.component.scss',
})
export class AddPersonComponent {
  @ViewChild(AddBtnRowComponent) addBtnRow!: AddBtnRowComponent;
  options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  protected tags: string[] = [];
  protected phonePattern = '[- +()0-9]+';
  protected form = this.fb.group({
    first_name: [''],
    middle_name: [''],
    last_name: [''],
    email: ['', Validators.email],
    email2: ['', Validators.email],
    home_phone: ['', Validators.pattern(this.phonePattern)],
    mobile: ['', Validators.pattern(this.phonePattern)],
    notes: [''],
    tags: [[]],
  });
  protected processing = signal(false);

  constructor(
    private fb: FormBuilder,
    private personSvc: PersonsGridService,
    private alertSvc: AlertService,
  ) {}

  protected async add() {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as UpdatePersonsType;
    await new Promise((f) => setTimeout(f, 2000));
    try {
      await this.personSvc.add(formObj);
      this.alertSvc.showSuccess('Person added successfully.');
      this.addBtnRow.stayOrCancel();
    } catch (err: any) {
      this.alertSvc.showError(err.message);
    }
    this.processing.set(false);
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
