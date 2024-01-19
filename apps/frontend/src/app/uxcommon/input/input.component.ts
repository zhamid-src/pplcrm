import {
  NgxGpAutocompleteModule,
  NgxGpAutocompleteOptions,
} from '@angular-magic/ngx-gp-autocomplete';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-input',
  standalone: true,
  imports: [
    CommonModule,
    IconsComponent,
    FormsModule,
    ReactiveFormsModule,
    NgxGpAutocompleteModule,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @Input() public googlePlaces: boolean = false;
  @Output() public googlePlacesAddressChange = new EventEmitter<google.maps.places.PlaceResult>();
  @Input() public icon: IconName | null = null;
  @Input() public placeholder: string = '';
  @Input() public type: string = 'text';
  @Output() public valueChange = new EventEmitter<string>();

  protected inputClass: string =
    'peer w-full h-full bg-transparent text-sm px-3 py-2.5 rounded-[7px] border-blue-gray-200 focus:outline-0 focus:border-primary focus:border-2 focus:border-t-transparent invalid:border-error invalid:border-t-transparent disabled:bg-gray-200 disabled:cursor-not-allowed transition-all placeholder-shown:border placeholder-shown:border-blue-gray-200 placeholder-shown:border-t-blue-gray-200 border';
  protected inputValue: string = '';
  protected options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  constructor() {}

  public handleAddressChange(place: google.maps.places.PlaceResult) {
    this.googlePlacesAddressChange?.emit(place);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleChange() {
    this.inputValue = '';
  }

  public handleKeyup() {
    this.valueChange?.emit(this.inputValue);
  }
}
