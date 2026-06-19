import { Component, ElementRef, OnInit, ViewChild, inject, input, output } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { parseAddress } from 'apps/frontend/src/app/utils/googlePlacesAddressMapper';
import { AddressType } from '../../../../common/src/lib/kysely.models';

@Component({
  selector: 'pc-address-autocomplete',
  standalone: true,
  template: `
    <div class="relative w-full">
      <input
        #inputEl
        type="text"
        class="input w-full"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        autocomplete="one-time-code"
      />
    </div>
  `,
})
export class AddressAutocomplete implements OnInit {
  private readonly loader = inject(Loader);

  public readonly disabled = input<boolean>(false);
  public readonly placeholder = input<string>('Start typing an address…');
  public readonly regionCodes = input<string[]>(['ca']);

  public readonly addressSelected = output<AddressType>();

  private inputElement: HTMLInputElement | null = null;
  private isLibraryLoaded = false;
  private isAutocompleteInitialized = false;

  @ViewChild('inputEl')
  set inputEl(elRef: ElementRef | undefined) {
    if (elRef) {
      this.inputElement = elRef.nativeElement;
      this.tryInitAutocomplete();
    }
  }

  public async ngOnInit() {
    try {
      await this.loader.importLibrary('places');
      this.isLibraryLoaded = true;
      this.tryInitAutocomplete();
    } catch (err) {
      console.error('Failed to load Google Maps Places library', err);
    }
  }

  private tryInitAutocomplete() {
    if (
      this.isAutocompleteInitialized ||
      !this.inputElement ||
      !this.isLibraryLoaded ||
      typeof google === 'undefined' ||
      !google.maps ||
      !google.maps.places
    ) {
      return;
    }

    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: this.regionCodes() },
      types: ['geocode'],
    };

    const autocomplete = new google.maps.places.Autocomplete(this.inputElement, options);
    this.isAutocompleteInitialized = true;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place) {
        const address = parseAddress(place);
        this.addressSelected.emit(address);
      }
    });
  }
}
