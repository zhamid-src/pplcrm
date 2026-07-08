import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme-service';
import { SettingsService } from '../../experiences/settings/services/settings-service';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockSettingsSvc: any;
  let mockSnapshotSignal: any;
  let settingsStore: Record<string, any>;

  beforeEach(() => {
    settingsStore = {
      'appearance.theme': 'light',
    };
    mockSnapshotSignal = signal({});
    mockSettingsSvc = {
      snapshotSignal: mockSnapshotSignal,
      getValue: vi.fn((key: string) => settingsStore[key]),
    };

    // Mock localStorage
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      store[key] = val;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete store[key];
    });
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      for (const k in store) {
        delete store[k];
      }
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize theme based on localStorage override', () => {
    localStorage.setItem('pc-theme', 'dark');
    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: SettingsService, useValue: mockSettingsSvc }],
    });
    service = TestBed.inject(ThemeService);
    expect(service.getTheme()).toBe('dark');
  });

  it('should fallback to SettingsService default theme if no localStorage override', () => {
    settingsStore['appearance.theme'] = 'dark';
    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: SettingsService, useValue: mockSettingsSvc }],
    });
    service = TestBed.inject(ThemeService);
    expect(service.getTheme()).toBe('dark');
  });

  it('should fallback to system settings if neither localStorage nor settings are set', () => {
    settingsStore['appearance.theme'] = undefined;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, // system is dark
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as any;

    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: SettingsService, useValue: mockSettingsSvc }],
    });
    service = TestBed.inject(ThemeService);
    expect(service.getTheme()).toBe('dark');
  });

  it('should toggle theme and store it in localStorage', () => {
    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: SettingsService, useValue: mockSettingsSvc }],
    });
    service = TestBed.inject(ThemeService);
    expect(service.getTheme()).toBe('light');

    service.toggleTheme();
    expect(service.getTheme()).toBe('dark');
    expect(localStorage.getItem('pc-theme')).toBe('dark');

    service.toggleTheme();
    expect(service.getTheme()).toBe('light');
    expect(localStorage.getItem('pc-theme')).toBe('light');
  });

  it('should follow the OS when the preference is explicitly system, ignoring the workspace default', () => {
    settingsStore['appearance.theme'] = 'light'; // workspace default is light
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, // but the OS is dark
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as any;

    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: SettingsService, useValue: mockSettingsSvc }],
    });
    service = TestBed.inject(ThemeService);

    service.setPreference('system');
    expect(service.getPreference()).toBe('system');
    expect(service.getTheme()).toBe('dark');
    expect(localStorage.getItem('pc-theme')).toBe('system');
  });

  it('should clear localStorage pc-theme override if default settings theme changes after load', async () => {
    // Initial setup: Settings default is 'light', user manually set override to 'dark'
    settingsStore['appearance.theme'] = 'light';
    localStorage.setItem('pc-theme', 'dark');

    TestBed.configureTestingModule({
      providers: [ThemeService, { provide: SettingsService, useValue: mockSettingsSvc }],
    });
    service = TestBed.inject(ThemeService);
    expect(service.getTheme()).toBe('dark'); // localStorage wins initially

    // Now default settings theme changes to 'dark' (e.g. user changes setting in UI)
    settingsStore['appearance.theme'] = 'dark';
    // Trigger the signal effect by updating the snapshot signal
    mockSnapshotSignal.set({});

    // Allow effects to run
    await TestBed.runInInjectionContext(() => {
      // Force Vitest/Angular to run scheduled effects
      return new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    // It should have called localStorage.removeItem('pc-theme') because the default theme changed.
    expect(localStorage.getItem('pc-theme')).toBeNull();
    // And theme should be updated to dark
    expect(service.getTheme()).toBe('dark');
  });
});
