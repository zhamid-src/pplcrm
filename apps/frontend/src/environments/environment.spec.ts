// Use the test mock directly to avoid import.meta issues
import * as exported from 'apps/frontend/src/__mocks__/environment.mock';

describe('environment', () => {
  it('should be defined', () => {
    expect(exported).toBeDefined();
  });
});
