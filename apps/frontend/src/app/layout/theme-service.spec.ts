/**
 * Unit tests verifying ThemeService behavior for detecting system preferences and
 * toggling between light and dark modes.
 */
import { ThemeService } from './theme-service';

describe('ThemeService', () => {
  const addEventListener = jest.fn();
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({ matches: false, addEventListener })
    });
    localStorage.clear();
    addEventListener.mockReset();
  });

  it('should default to dark when system prefers dark', () => {
    (window.matchMedia as jest.Mock).mockReturnValue({ matches: true, addEventListener });
    const service = new ThemeService();
    expect(service.getTheme()).toBe('dark');
  });

  it('should toggle theme and persist preference', () => {
    const service = new ThemeService();
    expect(service.getTheme()).toBe('light');
    service.toggleTheme();
    expect(service.getTheme()).toBe('dark');
    expect(localStorage.getItem('pc-theme')).toBe('dark');
  });
});
