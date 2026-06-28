import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Summary } from './summary';
import { DashboardService } from './services/dashboard.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';

describe('summary', () => {
  let component: Summary;
  let fixture: ComponentFixture<Summary>;
  let mockDashboardSvc: any;
  let mockAlertSvc: any;

  beforeEach(async () => {
    mockDashboardSvc = {
      getStats: vi.fn().mockResolvedValue({
        emailsAssigned: [],
        unassignedCount: 0,
        totalOpenCount: 0,
        avgFirstResponseHours: 0,
        avgTimeToCloseHours: 0,
        contactsGrowth: [],
        emailsClosed: [],
        unassignedEmailSlaBreaches: 0,
        unassignedTaskSlaBreaches: 0,
        userStats: [],
        breachedEmailsList: [],
        breachedTasksList: [],
        emailSlaHours: 24,
        taskSlaHours: 24,
        emailSlaWarningThreshold: 1,
        emailSlaCriticalThreshold: 4,
        taskSlaWarningThreshold: 1,
        taskSlaCriticalThreshold: 4,
      }),
    };

    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Summary],
      providers: [
        { provide: DashboardService, useValue: mockDashboardSvc },
        { provide: AlertService, useValue: mockAlertSvc },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be defined', () => {
    fixture = TestBed.createComponent(Summary);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should manage isRefreshing state with minimum duration delay', async () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Summary);
    component = fixture.componentInstance;

    expect(component['isRefreshing']()).toBe(false);

    // Trigger loadStats manually
    const loadPromise = component['loadStats']();

    // isRefreshing should immediately be true
    expect(component['isRefreshing']()).toBe(true);

    // Let the service call resolve, then advance timers
    await Promise.resolve(); // allow microtasks (like getStats resolving) to run

    // Advance by 500ms
    vi.advanceTimersByTime(500);
    expect(component['isRefreshing']()).toBe(true);

    // Advance by another 500ms
    vi.advanceTimersByTime(500);

    // Wait for the loadStats promise to completely finish
    await loadPromise;

    expect(component['isRefreshing']()).toBe(false);
  });

  it('should not trigger multiple loads if already refreshing', async () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Summary);
    component = fixture.componentInstance;

    // First load
    const firstLoad = component['loadStats']();
    expect(mockDashboardSvc.getStats).toHaveBeenCalledTimes(1);

    // Second load call immediately while refreshing
    const secondLoad = component['loadStats']();
    expect(mockDashboardSvc.getStats).toHaveBeenCalledTimes(1); // Still 1

    // Finish the refreshing
    await Promise.resolve();
    vi.advanceTimersByTime(1000);
    await firstLoad;
    await secondLoad;

    expect(component['isRefreshing']()).toBe(false);

    // Call load again after finishing
    component['loadStats']();
    expect(mockDashboardSvc.getStats).toHaveBeenCalledTimes(2);

    await Promise.resolve();
    vi.advanceTimersByTime(1000);
  });
});
