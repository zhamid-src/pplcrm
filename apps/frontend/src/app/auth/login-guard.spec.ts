/**
 * Unit tests for the login guard preventing authenticated users from accessing login pages.
 */
import * as exported from './login-guard';

/**
 * Test suite verifying the login guard export.
 */
describe('login-guard', () => {
  /**
   * Ensures the guard module is defined.
   */
  it('should be defined', () => {
    expect(exported).toBeDefined();
  });
});
