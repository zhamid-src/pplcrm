import { NgxGpAutocompleteModule, NgxGpAutocompleteOptions } from '@angular-magic/ngx-gp-autocomplete';
import { Component, EventEmitter, Output, ViewChild, WritableSignal, input, signal } from '@angular/core';
import { FormControl, NgModel, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '@uxcommon/icon';
import { IconName } from '@uxcommon/svg-icons-list';

@Component({
  selector: 'pc-input',
  imports: [Icon, ReactiveFormsModule, NgxGpAutocompleteModule],
  templateUrl: './input.html',
})
export class PPlCrmInput {
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastEmittedValue = '';

  protected debouncedValue: WritableSignal<string> = signal('');
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

  protected get inputLength(): number {
    return this.inputControl.value?.length ?? 0;
  }

  public clearText() {
    this.inputControl.setValue('');
  }

  public debounceValueChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputValue.set(target.value);

    if (this._debounceTimer) clearTimeout(this._debounceTimer);

    this._debounceTimer = setTimeout(() => {
      if (target.value !== this._lastEmittedValue) {
        this._lastEmittedValue = target.value;
        this.valueChange?.emit(target.value);
      }
    }, this.debounceTime());
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
