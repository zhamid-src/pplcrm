// Use the test mock directly to avoid import.meta issues
import { environment } from 'apps/frontend/src/__mocks__/environment.mock';

describe('environment (dev mock)', () => {
  it('marks the build as non-production', () => {
    expect(environment.production).toBe(false);
  });

  it('points apiUrl at the local dev backend', () => {
    expect(environment.apiUrl).toBe('http://localhost:3000');
  });

  it('exposes a string googleMapsApiKey', () => {
    expect(typeof environment.googleMapsApiKey).toBe('string');
  });
});
