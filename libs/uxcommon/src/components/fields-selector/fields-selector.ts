import { Component, input, output } from '@angular/core';

const ALL_FIELDS: { key: string; label: string }[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'mobile', label: 'Mobile / Phone' },
  { key: 'notes', label: 'Notes' },
  { key: 'street1', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State / Province' },
  { key: 'zip', label: 'Zip / Postal Code' },
  { key: 'country', label: 'Country' },
];

@Component({
  selector: 'pc-fields-selector',
  templateUrl: './fields-selector.html',
})
export class FieldsSelector {
  readonly selectedFields = input.required<string[]>();
  readonly fieldsChange = output<string[]>();

  protected readonly allFields = ALL_FIELDS;

  protected isEnabled(field: string): boolean {
    const list = this.selectedFields();
    return list.includes(field) || list.includes(`${field}:required`);
  }

  protected isRequired(field: string): boolean {
    return this.selectedFields().includes(`${field}:required`);
  }

  protected toggleField(field: string): void {
    const current = this.selectedFields();
    const enabled = current.includes(field) || current.includes(`${field}:required`);
    if (enabled) {
      this.fieldsChange.emit(current.filter((f) => f !== field && f !== `${field}:required`));
    } else {
      this.fieldsChange.emit([...current, field]);
    }
  }

  protected toggleRequired(field: string): void {
    const current = this.selectedFields();
    if (current.includes(field)) {
      this.fieldsChange.emit([...current.filter((f) => f !== field), `${field}:required`]);
    } else if (current.includes(`${field}:required`)) {
      this.fieldsChange.emit([...current.filter((f) => f !== `${field}:required`), field]);
    }
  }
}
