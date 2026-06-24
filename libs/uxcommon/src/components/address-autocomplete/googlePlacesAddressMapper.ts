import type { AddressType } from '../../../../common/src/lib/kysely.models';

type AddressTypeMapInterface = {
  [key in keyof AddressType]: string[];
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
      if (googleAddressToAddressTypeMap[key]?.indexOf(component.types[0]!) !== -1) {
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

export function parsePlace(place: google.maps.places.Place): AddressType {
  const address: AddressType = {};

  const addressComponents = place.addressComponents;
  if (!addressComponents || addressComponents.length === 0) {
    return address;
  }

  addressComponents.forEach((component: any) => {
    for (const mapKey in googleAddressToAddressTypeMap) {
      const key = mapKey as keyof typeof googleAddressToAddressTypeMap;
      if (component.types && googleAddressToAddressTypeMap[key]?.indexOf(component.types[0]) !== -1) {
        (address[key] as string) = key === 'country' ? component.shortText : component.longText;
      }
    }
  });

  address.formatted_address = place.formattedAddress ?? undefined;
  address.lat = place.location?.lat() ?? undefined;
  address.lng = place.location?.lng() ?? undefined;
  address.type = (place.types && place.types[0]) ?? undefined;

  return address;
}

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
