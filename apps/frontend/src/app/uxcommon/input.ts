import { NgxGpAutocompleteModule, NgxGpAutocompleteOptions } from '@angular-magic/ngx-gp-autocomplete';
import { Component, EventEmitter, Output, ViewChild, WritableSignal, input, signal } from '@angular/core';
import { FormControl, NgModel, ReactiveFormsModule } from '@angular/forms';
import { debounce } from '@common';
import { Icon } from '@icons/icon';
import { IconName } from '@icons/icons.index';

@Component({
  selector: 'pc-input',
  imports: [Icon, ReactiveFormsModule, NgxGpAutocompleteModule],
  templateUrl: './input.html',
})
export class PPlCrmInput {
  private lastEmittedValue = '';

  protected inputClass = `
  peer w-full h-full bg-transparent text-sm px-3 py-2.5 rounded-[7px]
  border-blue-gray-200 focus:outline-0 focus:border-primary focus:border-2
  focus:border-t-transparent invalid:border-error invalid:border-t-transparent
  disabled:bg-base-300 disabled:cursor-not-allowed transition-all
  placeholder-shown:border placeholder-shown:border-blue-gray-200
  placeholder-shown:border-t-blue-gray-200 border
`.trim();
  protected inputValue: WritableSignal<string> = signal('');
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
  public inputControl = new FormControl('');
  @Output() public lostFocus = new EventEmitter();
  public placeholder = input<string>('');
  public type = input<string>('text');
  @Output() public valueChange = new EventEmitter<string>();

  private emitValueChange = debounce((value: string) => {
    if (value !== this.lastEmittedValue) {
      this.lastEmittedValue = value;
      this.valueChange?.emit(value);
    }
  }, this.debounceTime());

  protected get inputLength(): number {
    return this.inputControl.value?.length ?? 0;
  }

  public clearText() {
    this.inputControl.setValue('');
  }

  public debounceValueChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputValue.set(target.value);

    this.emitValueChange(target.value);
  }

  public handleAddressChange(place: google.maps.places.PlaceResult) {
    this.googlePlacesAddressChange?.emit(place);
  }

  public handleBlur() {
    this.inputValue.set('');
    this.lostFocus.emit();
  }

  public handleFocus() {
    this.gotFocus.emit();
  }
}
