import {
  NgxGpAutocompleteModule,
  NgxGpAutocompleteOptions,
} from '@angular-magic/ngx-gp-autocomplete';

import { AfterViewInit, Component, EventEmitter, Output, ViewChild, input } from '@angular/core';
import { FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '@uxcommon/icons/icons';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'pc-input',
    imports: [
    IconsComponent,
    FormsModule,
    ReactiveFormsModule,
    NgxGpAutocompleteModule
],
    templateUrl: './input.component.html',
    styleUrl: './input.component.css'
})
export class InputComponent implements AfterViewInit {
  public debounceTime = input<number>(250);
  public disabled = input<boolean>(false);
  public googlePlaces = input<boolean>(false);
  @Output() public googlePlacesAddressChange = new EventEmitter<google.maps.places.PlaceResult>();
  @Output() public gotFocus = new EventEmitter();
  public icon = input<IconName | null>(null);
  @ViewChild('input') public input: NgModel | undefined;
  @Output() public lostFocus = new EventEmitter();
  public placeholder = input<string>('');
  public type = input<string>('text');
  @Output() public valueChange = new EventEmitter<string>();

  protected inputClass: string =
    'peer w-full h-full bg-transparent text-sm px-3 py-2.5 rounded-[7px] border-blue-gray-200 focus:outline-0 focus:border-primary focus:border-2 focus:border-t-transparent invalid:border-error invalid:border-t-transparent disabled:bg-base-300 disabled:cursor-not-allowed transition-all placeholder-shown:border placeholder-shown:border-blue-gray-200 placeholder-shown:border-t-blue-gray-200 border';
  protected inputValue: string = '';
  protected options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  constructor() {}

  public ngAfterViewInit() {
    if (!this.input) {
      return;
    }

    console.log('*****', this.icon(), this.placeholder());

    this.input?.valueChanges
      ?.pipe(debounceTime(this.debounceTime()), distinctUntilChanged())
      .subscribe((value) => {
        this.handleKeyup(value);
      });
  }

  public handleAddressChange(place: google.maps.places.PlaceResult) {
    this.googlePlacesAddressChange?.emit(place);
  }

  public handleBlur() {
    this.inputValue = '';
    this.lostFocus.emit();
  }

  public handleFocus() {
    this.gotFocus.emit();
  }

  public handleKeyup(value: string) {
    this.valueChange?.emit(value);
  }
}
