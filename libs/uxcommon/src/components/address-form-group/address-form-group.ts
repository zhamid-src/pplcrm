import { Component, input } from '@angular/core';
import { Input as PcInput } from '../input/input';

@Component({
  selector: 'pc-address-form-group',
  imports: [PcInput],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex flex-col md:flex-row gap-3">
        <pc-input
          class="flex-1"
          placeholder="Unit / Apt"
          [formField]="form().apt"
        ></pc-input>
        <pc-input
          class="flex-1"
          placeholder="Street Number"
          [formField]="form().street_num"
        ></pc-input>
        <pc-input
          class="flex-2"
          placeholder="Street Name"
          [formField]="form().street1"
        ></pc-input>
      </div>
      <div class="flex flex-col md:flex-row gap-3">
        <pc-input
          class="flex-1"
          placeholder="City"
          [formField]="form().city"
        ></pc-input>
        <pc-input
          class="flex-1"
          placeholder="State / Province"
          [formField]="form().state"
        ></pc-input>
        <pc-input
          class="flex-1"
          placeholder="Country"
          [formField]="form().country"
        ></pc-input>
      </div>
      <div class="flex flex-col md:flex-row gap-3">
        <pc-input
          class="flex-1"
          placeholder="Zip / Postal Code"
          [formField]="form().zip"
        ></pc-input>
        <pc-input
          class="flex-1"
          type="tel"
          placeholder="Home Phone"
          [formField]="form().home_phone"
        ></pc-input>
        <div class="flex-1"></div>
      </div>
    </div>
  `,
})
export class AddressFormGroup {
  public form = input.required<any>();
}
