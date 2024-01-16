import { AddressType } from 'common/src/lib/kysely.models';

type AddressTypeMapInterface = {
  [key in keyof AddressType]: string[];
};

// Google Places returns an array with objects that contain different pieces
// of the address. This map tells us which object maps to what. We use
// them in priority order. So if it has "locality" and "sublocality" then
// we'll take locality because it occurs first.
const googleAddressToAddressTypeMap: Partial<AddressTypeMapInterface> = {
  apt: ['subpremise'],
  street_num: ['street_number'],
  zip: ['postal_code'],
  street: ['street_address', 'route'],
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
