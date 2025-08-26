import { AlertService } from './alert-service';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => 'id-1' },
      writable: true,
    });
    service = new AlertService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show and dismiss alert', () => {
    service.show({ text: 'hi', type: 'info' });
    const id = service.getAlerts()[0].id;
    service.dismiss(id);
    jest.runAllTimers();
    expect(service.getAlerts()).toHaveLength(0);
  });

  it('should call OK button callback', () => {
    const callback = jest.fn();
    service.show({ text: 'x', type: 'success', OKBtnCallback: callback });
    const id = service.getAlerts()[0].id;
    service.OKBtnCallback(id);
    expect(callback).toHaveBeenCalled();
  });
});

