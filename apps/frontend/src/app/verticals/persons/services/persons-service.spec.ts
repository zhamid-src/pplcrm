/**
 * @file Basic existence test for {@link PersonsService} exports.
 */
import * as exported from './persons-service';

describe('persons-service', () => {
  it('should be defined', () => {
    expect(exported).toBeDefined();
  });
});
