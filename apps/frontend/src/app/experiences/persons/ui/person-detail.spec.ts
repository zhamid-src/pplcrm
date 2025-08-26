/**
 * @file Basic test to ensure {@link PersonDetail} component exports exist.
 */
import * as exported from './person-detail';

describe('person-detail', () => {
  it('should be defined', () => {
    expect(exported).toBeDefined();
  });
});
