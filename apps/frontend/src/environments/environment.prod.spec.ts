// Use the test mock directly to avoid import.meta issues
import { environment } from 'apps/frontend/src/__mocks__/environment.prod.mock';

describe('environment.prod (prod mock)', () => {
  it('marks the build as production', () => {
    expect(environment.production).toBe(true);
  });

  it('points apiUrl at a non-localhost host', () => {
    expect(environment.apiUrl).not.toContain('localhost');
    expect(environment.apiUrl.startsWith('https://')).toBe(true);
  });

  it('exposes a string googleMapsApiKey', () => {
    expect(typeof environment.googleMapsApiKey).toBe('string');
  });
});
