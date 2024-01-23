import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdatePersonsType } from '@common';
import { AlertService } from '@services/alert.service';
import { HouseholdsBackendService } from '@services/backend/households.service';
import { PersonsBackendService } from '@services/backend/persons.service';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { FormInputComponent } from '@uxcommon/form-input/formInput.component';
import { InputComponent } from '@uxcommon/input/input.component';
import { TagsComponent } from '@uxcommon/tags/tags.component';
import { TextareaComponent } from '@uxcommon/textarea/textarea.component';
import { AddressType, Persons } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-person-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormInputComponent,
    FormsModule,
    ReactiveFormsModule,
    InputComponent,
    TagsComponent,
    AddBtnRowComponent,
    TextareaComponent,
  ],
  templateUrl: './PersonDetail.component.html',
  styleUrl: './PersonDetail.component.scss',
})
export class PersonDetailComponent implements OnInit {
  @Input() public mode: 'new' | 'edit' = 'edit';

  protected addressString = signal<string | null>(null);
  protected form = this.fb.group({
    first_name: [''],
    middle_names: [''],
    last_name: [''],
    email: [''],
    email2: [''],
    home_phone: [''],
    mobile: [''],
    notes: [''],
    metadata: this.fb.group({
      tenant_id: [''],
      createdby_id: [''],
      updatedby_id: [''],
      created_at: [''],
      updated_at: [''],
    }),
  });
  protected id: string | null = null;
  protected person: Persons | undefined;
  protected processing = signal(false);
  protected tags: string[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private personsSvc: PersonsBackendService,
    private householdsSvc: HouseholdsBackendService,
    private alertSvc: AlertService,
  ) {
    if (this.mode === 'edit') {
      this.id = this.route.snapshot.paramMap.get('id');
    }
  }

  public async ngOnInit() {
    await this.loadPerson();
  }

  public save() {
    const data = this.form.getRawValue() as UpdatePersonsType;
    return this.id ? this.update(data) : this.add(data);
  }

  /**
   * Apply the edits the user did on the grid. This is done by calling the
   * backend service to update the row in the database.
   *
   * @param id
   * @param data
   * @returns Boolean indicating whether the edit was successful or not
   */
  protected async applyEdit(input: { key: string; value: string; changed: boolean }) {
    if (input.changed) {
      const row = { [input.key]: input.value };
      this.update(row);
    }
  }

  protected async getAddressString() {
    if (this.person?.household_id) {
      const address = (await this.householdsSvc.getById(this.person.household_id)) as AddressType;
      this.addressString.set(address.formatted_address || null);
    }
  }

  protected getCreatedAt() {
    return this.person?.created_at;
  }

  protected getFormName() {
    return `${this.form.get('first_name')?.value} ${this.form.get('middle_names')
      ?.value}  ${this.form.get('last_name')?.value}`;
  }

  protected getUpdatedAt() {
    return this.person?.updated_at;
  }

  protected navigateToHousehold() {
    if (this.person?.household_id) {
      this.router.navigate(['console', 'households', this.person.household_id]);
    }
  }

  protected tagAdded(tag: string) {
    this.personsSvc.addTag(this.id!, tag);
  }

  protected tagRemoved(tag: string) {
    this.personsSvc.removeTag(this.id!, tag);
  }

  private add(data: UpdatePersonsType) {
    this.processing.set(true);
    this.personsSvc
      .add(data)
      .then(() => this.alertSvc.showSuccess('Person added'))
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }

  private async getTags() {
    if (!this.person) {
      return;
    }
    this.tags = await this.personsSvc.getTags(this.id!);
  }

  private async loadPerson() {
    if (!this.id) {
      return;
    }
    this.processing.set(true);

    this.person = (await this.personsSvc.getById(this.id!)) as Persons;
    this.getAddressString();
    this.getTags();
    this.refreshForm();

    this.processing.set(false);
  }

  private refreshForm() {
    if (!this.person) {
      return;
    }
    this.form.patchValue(this.person);
  }

  private update(data: Partial<UpdatePersonsType>) {
    if (!this.id) {
      return;
    }

    this.processing.set(true);
    this.personsSvc
      .update(this.id, data)
      .then(() => {
        this.alertSvc.showSuccess('Person updated successfully.');
        this.form.markAsPristine();
      })
      .catch((err) => this.alertSvc.showError(err))
      .finally(() => this.processing.set(false));
  }
}
