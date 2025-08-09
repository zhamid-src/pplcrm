import config from './jest.config';

describe('jest.config', () => {
  it('should be defined', () => {
    expect(config).toBeDefined();
  });
});
