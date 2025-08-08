import { parseAddress } from './googlePlacesAddressMapper';

describe('parseAddress', () => {
  it('should map google place result to AddressType', () => {
    const place: any = {
      address_components: [
        { long_name: '1600', short_name: '1600', types: ['street_number'] },
        { long_name: 'Amphitheatre Pkwy', short_name: 'Amphitheatre Pkwy', types: ['route'] },
        { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
        { long_name: 'CA', short_name: 'CA', types: ['administrative_area_level_1'] },
        { long_name: '94043', short_name: '94043', types: ['postal_code'] },
        { long_name: 'United States', short_name: 'US', types: ['country'] },
      ],
      formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
      geometry: { location: { lat: () => 37.422, lng: () => -122.084 } },
      types: ['street_address'],
    };

    const result = parseAddress(place);

    expect(result).toEqual({
      street_num: '1600',
      street1: 'Amphitheatre Pkwy',
      city: 'Mountain View',
      state: 'CA',
      zip: '94043',
      country: 'US',
      formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
      lat: 37.422,
      lng: -122.084,
      type: 'street_address',
    });
  });

  it('should return empty object when address components missing', () => {
    const place: any = {};
    expect(parseAddress(place)).toEqual({});
  });
});
