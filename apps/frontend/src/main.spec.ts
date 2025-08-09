jest.mock('@angular/platform-browser', () => ({
  bootstrapApplication: jest.fn().mockResolvedValue(null),
}));

describe('main entry', () => {
  it('should bootstrap the app', async () => {
    await import('./main');
    const { bootstrapApplication } = require('@angular/platform-browser');
    expect(bootstrapApplication).toHaveBeenCalled();
  });
});
