import { AddressType } from 'common/src/lib/kysely.models';

/**
 * Maps the internal `AddressType` keys to the corresponding Google Places component types.
 * This helps prioritize which parts of the Google response to use for each address field.
 */
type AddressTypeMapInterface = {
  [key in keyof AddressType]: string[];
};

/**
 * Parses a Google Maps PlaceResult object into a custom AddressType.
 *
 * @param place - The result object returned from the Google Places API.
 * @returns An AddressType object with mapped fields like `city`, `state`, `country`, etc.
 *
 * The function:
 * - Loops through Google's address components
 * - Matches each component to the desired AddressType key using a prioritized map
 * - Uses `short_name` for `country`, `long_name` for all others
 * - Extracts lat/lng and formatted address if available
 */
export function parseAddress(place: google.maps.places.PlaceResult): AddressType {
  const address: AddressType = {};

  if (!place.address_components || place.address_components.length === 0) {
    return address;
  }

  const address_components: google.maps.GeocoderAddressComponent[] = place.address_components;

  address_components.forEach((component) => {
    for (const mapKey in googleAddressToAddressTypeMap) {
      const key = mapKey as keyof typeof googleAddressToAddressTypeMap;
      if (googleAddressToAddressTypeMap[key]?.indexOf(component.types[0]) !== -1) {
        (address[key] as string) = key === 'country' ? component.short_name : component.long_name;
      }
    }
  });

  address.formatted_address = place.formatted_address;
  address.lat = place.geometry?.location?.lat();
  address.lng = place.geometry?.location?.lng();
  address.type = place.types && place.types[0];

  return address;
}

/**
 * Google Places returns multiple types of address components.
 * This map defines the priority of those types for each internal address field.
 */
const googleAddressToAddressTypeMap: Partial<AddressTypeMapInterface> = {
  apt: ['subpremise'],
  street_num: ['street_number'],
  zip: ['postal_code'],
  street1: ['street_address', 'route'],
  city: [
    'locality',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
  ],
  state: [
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
  ],
  country: ['country'],
};
