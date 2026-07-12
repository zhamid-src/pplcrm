import { Component, ElementRef, OnInit, effect, inject, input, output, viewChild } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { AddressType } from '../../../../common/src/lib/kysely.models';
import { parseAddress } from './googlePlacesAddressMapper';

/**
 * `<pc-address-autocomplete>` — a text input that upgrades into a Google Places
 * Autocomplete field (§6 / §13 / §14 maps ruling: Google Maps Platform only).
 *
 * Two shapes of consumer:
 * - **Search box** (household form): ignore `value`/`textChange`, listen to
 *   `addressSelected` to fan a structured `AddressType` into other fields.
 * - **Field of record** (plan-routes start address): seed with `value`, keep a
 *   signal in sync via `textChange` (freeform typing) *and* `addressSelected`
 *   (picking a suggestion).
 *
 * The `Loader` is injected **optionally** — mirroring `<pc-map>` — so unit tests
 * and any host without an API key keep a plain, fully-functional text input and
 * never touch the network.
 */
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
        [value]="value()"
        (input)="onInput($event)"
        autocomplete="one-time-code"
      />
    </div>
  `,
})
export class AddressAutocomplete implements OnInit {
  /** Optional so unit tests (and any host without the SDK key) keep a plain text input. */
  private readonly loader = inject(Loader, { optional: true });

  public readonly disabled = input<boolean>(false);
  public readonly placeholder = input<string>('Start typing an address…');
  public readonly regionCodes = input<string[]>(['ca']);
  /** Seeds the field and reflects programmatic changes (for field-of-record use). */
  public readonly value = input<string>('');

  public readonly addressSelected = output<AddressType>();
  /** Raw text on every keystroke — for consumers that treat this as the field of record. */
  public readonly textChange = output<string>();

  private inputElement: HTMLInputElement | null = null;
  private isLibraryLoaded = false;
  private isAutocompleteInitialized = false;

  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  constructor() {
    effect(() => {
      const elRef = this.inputEl();
      if (elRef) {
        this.inputElement = elRef.nativeElement;
        this.tryInitAutocomplete();
      }
    });
  }

  public ngOnInit() {
    void this.initialize();
  }

  protected onInput(event: Event): void {
    this.textChange.emit((event.target as HTMLInputElement).value);
  }

  private async initialize() {
    if (!this.loader) return;
    try {
      await this.loader.importLibrary('places');
      this.isLibraryLoaded = true;
      this.tryInitAutocomplete();
    } catch (err) {
      // Bad key / offline / blocked — stay on the honest plain input.
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
        // Keep field-of-record consumers in sync with the picked formatted address.
        if (place.formatted_address) this.textChange.emit(place.formatted_address);
        this.addressSelected.emit(address);
      }
    });
  }
}
