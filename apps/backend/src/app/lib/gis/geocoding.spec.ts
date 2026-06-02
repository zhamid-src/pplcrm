import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPointInPolygon,
  isPointInMultiPolygon,
  matchCoordinatesToDistrict,
  geocodeAndMapHousehold,
} from './geocoding';

// Mock fs to control boundaries GeoJSON file loading
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              district: 'District 1',
              precinct: 'Precinct A',
              ward: 'Ward 1',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-87.64, 41.87],
                  [-87.62, 41.87],
                  [-87.62, 41.89],
                  [-87.64, 41.89],
                  [-87.64, 41.87],
                ],
              ],
            },
          },
        ],
      }),
    ),
  },
}));

describe('GIS Boundary Math & Matching', () => {
  const loopPolygon = [
    [
      [-87.64, 41.87],
      [-87.62, 41.87],
      [-87.62, 41.89],
      [-87.64, 41.89],
      [-87.64, 41.87],
    ],
  ];

  it('isPointInPolygon should return true for a point inside the bounds', () => {
    // Inside: lat 41.88, lng -87.63
    expect(isPointInPolygon(-87.63, 41.88, loopPolygon)).toBe(true);
  });

  it('isPointInPolygon should return false for a point outside the bounds', () => {
    // Outside: lat 41.88, lng -87.65
    expect(isPointInPolygon(-87.65, 41.88, loopPolygon)).toBe(false);
  });

  it('isPointInMultiPolygon should return true if inside any of the polygons', () => {
    const multi = [loopPolygon];
    expect(isPointInMultiPolygon(-87.63, 41.88, multi)).toBe(true);
  });

  it('matchCoordinatesToDistrict should return mapped properties for matching point', async () => {
    const result = await matchCoordinatesToDistrict(41.88, -87.63);
    expect(result.district).toBe('District 1');
    expect(result.precinct).toBe('Precinct A');
    expect(result.ward).toBe('Ward 1');
  });

  it('matchCoordinatesToDistrict should return nulls if outside of any boundaries', async () => {
    const result = await matchCoordinatesToDistrict(45.0, -90.0);
    expect(result.district).toBeNull();
    expect(result.precinct).toBeNull();
    expect(result.ward).toBeNull();
  });
});

describe('geocodeAndMapHousehold Background Job', () => {
  let dbMock: any;
  let updateMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    updateMock = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
    };

    dbMock = {
      selectFrom: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn(),
      updateTable: vi.fn().mockReturnValue(updateMock),
    };
  });

  it('should mark status as failed if the address is blank', async () => {
    // Return a blank household
    dbMock.executeTakeFirst.mockResolvedValue({
      id: '100',
      tenant_id: '1',
      street_num: '',
      street1: '',
      city: '',
    });

    await geocodeAndMapHousehold('100', '1', dbMock);

    expect(dbMock.updateTable).toHaveBeenCalledWith('households');
    expect(updateMock.set).toHaveBeenCalledWith(
      expect.objectContaining({
        geocoding_status: 'failed',
        district: null,
        precinct: null,
        ward: null,
      }),
    );
  });

  it('should geocode successfully and map boundaries in mock/test mode', async () => {
    // Return a valid household address
    dbMock.executeTakeFirst.mockResolvedValue({
      id: '100',
      tenant_id: '1',
      street_num: '123',
      street1: 'Main St',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
    });

    await geocodeAndMapHousehold('100', '1', dbMock);

    expect(dbMock.updateTable).toHaveBeenCalledWith('households');
    expect(updateMock.set).toHaveBeenCalledWith(
      expect.objectContaining({
        geocoding_status: 'success',
        lat: expect.any(Number),
        lng: expect.any(Number),
      }),
    );
  });
});
