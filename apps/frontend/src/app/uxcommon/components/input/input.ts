//tsco: ignore
/**
 * @fileoverview Reusable input component with Google Places integration and advanced features.
 * Provides a styled input field with optional icon, debounced value changes, and Google Places autocomplete.
 */
import { NgxGpAutocompleteModule, NgxGpAutocompleteOptions } from '@angular-magic/ngx-gp-autocomplete';
import { Component, ViewChild, WritableSignal, input, output, signal } from '@angular/core';
import { FormControl, NgModel, ReactiveFormsModule } from '@angular/forms';
import { debounce } from '@common';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * Advanced input component with Google Places integration and enhanced UX features.
 *
 * This component provides a comprehensive input solution that extends standard HTML inputs
 * with additional functionality including debounced value changes, Google Places autocomplete,
 * icon support, and consistent styling across the application.
 *
 * **Key Features:**
 * - **Debounced Input**: Configurable debounce timing to reduce API calls
 * - **Google Places**: Optional address autocomplete with Canadian focus
 * - **Icon Support**: Optional leading icon for visual context
 * - **Responsive Design**: Consistent styling with focus states and validation
 * - **Accessibility**: Proper ARIA attributes and keyboard navigation
 * - **Reactive Forms**: Full integration with Angular reactive forms
 *
 * **Google Places Integration:**
 * When enabled, the component provides address autocomplete functionality
 * restricted to Canadian addresses with geocoding support.
 *
 * @example
 * ```html
 * <!-- Basic input -->
 * <pc-input
 *   placeholder="Enter your name"
 *   (valueChange)="onNameChange($event)">
 * </pc-input>
 *
 * <!-- Input with icon and debouncing -->
 * <pc-input
 *   placeholder="Search..."
 *   icon="search"
 *   [debounceTime]="500"
 *   (valueChange)="onSearch($event)">
 * </pc-input>
 *
 * <!-- Google Places address input -->
 * <pc-input
 *   placeholder="Enter address"
 *   [googlePlaces]="true"
 *   icon="location"
 *   (googlePlacesAddressChange)="onAddressSelected($event)">
 * </pc-input>
 * ```
 */
@Component({
  selector: 'pc-input',
  imports: [Icon, ReactiveFormsModule, NgxGpAutocompleteModule],
  templateUrl: './input.html',
})
export class PPlCrmInput {
  /** Tracks the last emitted value to prevent duplicate emissions */
  private lastEmittedValue = '';

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /** Debounce time in milliseconds for value change emissions (default: 250ms) */
  public debounceTime = input<number>(250);

  /**
   * Debounced function that emits value changes only when the value actually changes.
   * Prevents duplicate emissions and reduces unnecessary processing.
   */
  private emitValueChange = debounce((value: string) => {
    if (value !== this.lastEmittedValue) {
      this.lastEmittedValue = value;
      this.valueChange?.emit(value);
    }
  }, this.debounceTime());


  /** Reactive signal for tracking current input value */
  protected inputValue: WritableSignal<string> = signal('');

  /**
   * Configuration options for Google Places autocomplete.
   * Restricts results to Canadian addresses with geocoding support.
   */
  protected options: NgxGpAutocompleteOptions = {
    componentRestrictions: { country: ['CA'] },
    types: ['geocode'],
  };

  // =============================================================================
  // COMPONENT OUTPUTS
  // =============================================================================

  /** Emitted when a Google Places address is selected */
  public readonly googlePlacesAddressChange = output<google.maps.places.PlaceResult>();

  /** Emitted when the input gains focus */
  public readonly gotFocus = output();

  /** Emitted when the input loses focus */
  public readonly lostFocus = output();

  /** Emitted when the input value changes (debounced) */
  public readonly valueChange = output<string>();

  // =============================================================================
  // COMPONENT PROPERTIES
  // =============================================================================

  /** ViewChild reference to the input element for direct access */
  @ViewChild('input') public input: NgModel | undefined;

  // =============================================================================
  // COMPONENT INPUTS
  // =============================================================================

  /** Whether the input is disabled */
  public disabled = input<boolean>(false);

  /** Enable Google Places autocomplete functionality */
  public googlePlaces = input<boolean>(false);

  /** Optional icon to display at the start of the input */
  public icon = input<PcIconNameType | null>(null);

  /** Form control for reactive forms integration */
  public inputControl = new FormControl('');

  /** Placeholder text to display when input is empty */
  public placeholder = input<string>('');

  /** HTML input type (text, email, password, etc.) */
  public type = input<string>('text');

  // =============================================================================
  // PROTECTED GETTERS
  // =============================================================================

  // (DaisyUI handles styling; no floating label length logic required.)

  // =============================================================================
  // PUBLIC METHODS
  // =============================================================================

  /**
   * Clears the input value programmatically.
   * Useful for reset buttons or form clearing functionality.
   */
  public clearText(): void {
    this.inputControl.setValue('');
  }

  /**
   * Handles input value changes with debouncing.
   * Updates the internal signal and triggers debounced emission.
   *
   * @param event - The input change event
   */
  public debounceValueChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputValue.set(target.value);
    this.emitValueChange(target.value);
  }

  /**
   * Handles Google Places address selection.
   * Emits the selected place result for parent component processing.
   *
   * @param place - The selected Google Places result
   */
  public handleAddressChange(place: google.maps.places.PlaceResult): void {
    this.googlePlacesAddressChange?.emit(place);
  }

  /**
   * Handles input blur events.
   * Clears the internal value signal and emits focus lost event.
   */
  public handleBlur(): void {
    this.inputValue.set('');
    this.lostFocus.emit();
  }

  /**
   * Handles input focus events.
   * Emits focus gained event for parent component handling.
   */
  public handleFocus(): void {
    this.gotFocus.emit();
  }
}
