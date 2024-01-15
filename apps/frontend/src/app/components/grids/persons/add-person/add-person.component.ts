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
import { TRPCError } from '@trpc/server';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { InputComponent } from '@uxcommon/input/input.component';
import { TagsComponent } from '@uxcommon/tags/tags.component';

@Component({
  selector: 'pc-add-person',
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
  @ViewChild(AddBtnRowComponent) public addBtnRow!: AddBtnRowComponent;
  public options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  protected form = this.fb.group({
    first_name: [''],
    middle_name: [''],
    last_name: [''],
    email: ['', Validators.email],
    email2: ['', Validators.email],
    home_phone: ['', Validators.pattern('[- +()0-9]+')],
    mobile: ['', Validators.pattern('[- +()0-9]+')],
    notes: [''],
    tags: [[]],
  });
  protected processing = signal(false);
  protected tags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private personSvc: PersonsGridService,
    private alertSvc: AlertService,
  ) {}

  public handleAddressChange(place: google.maps.places.PlaceResult) {
    if (!place?.address_components?.length) {
      this.alertSvc.showError('Please select the correct address from the list or leave it blank');
      return;
    }
    this.processing.set(true);
    console.log(place);
  }

  protected async add() {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as UpdatePersonsType;
    await new Promise((f) => setTimeout(f, 2000));
    try {
      await this.personSvc.add(formObj);
      this.alertSvc.showSuccess('Person added successfully.');
      this.addBtnRow.stayOrCancel();
    } catch (err: unknown) {
      if (err instanceof TRPCError) {
        this.alertSvc.showError(err.message);
      } else {
        this.alertSvc.showError("We've hit an unknown error. Please try again.");
      }
    }
    this.processing.set(false);
  }
}
