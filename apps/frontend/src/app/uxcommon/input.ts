import { NgxGpAutocompleteModule, NgxGpAutocompleteOptions } from '@angular-magic/ngx-gp-autocomplete';
import { AfterViewInit, Component, EventEmitter, Output, ViewChild, input } from '@angular/core';
import { FormControl, NgModel, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@uxcommon/icon';
import { IconName } from '@uxcommon/svg-icons-list';

import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'pc-input',
  imports: [Icon, ReactiveFormsModule, NgxGpAutocompleteModule],
  templateUrl: './input.html',
})
export class PPlCrmInput implements AfterViewInit {
  protected inputClass = `
  peer w-full h-full bg-transparent text-sm px-3 py-2.5 rounded-[7px]
  border-blue-gray-200 focus:outline-0 focus:border-primary focus:border-2
  focus:border-t-transparent invalid:border-error invalid:border-t-transparent
  disabled:bg-base-300 disabled:cursor-not-allowed transition-all
  placeholder-shown:border placeholder-shown:border-blue-gray-200
  placeholder-shown:border-t-blue-gray-200 border
`.trim();
  protected inputValue = '';
  protected options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  @ViewChild('input') public input: NgModel | undefined;
  public debounceTime = input<number>(250);
  public disabled = input<boolean>(false);
  public googlePlaces = input<boolean>(false);
  @Output() public googlePlacesAddressChange = new EventEmitter<google.maps.places.PlaceResult>();
  @Output() public gotFocus = new EventEmitter();
  public icon = input<IconName | null>(null);
  @Output() public lostFocus = new EventEmitter();
  public placeholder = input<string>('');
  public type = input<string>('text');
  @Output() public valueChange = new EventEmitter<string>();

  inputControl = new FormControl('');

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

  protected get inputLength(): number {
    return this.inputControl.value?.length ?? 0;
  }

  public ngAfterViewInit() {
    if (!this.input) {
      return;
    }

    console.log('*****', this.icon(), this.placeholder());

    this.input?.valueChanges?.pipe(debounceTime(this.debounceTime()), distinctUntilChanged()).subscribe((value) => {
      this.handleKeyup(value);
    });
  }
}
