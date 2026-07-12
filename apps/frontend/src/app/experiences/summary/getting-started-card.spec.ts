import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../auth/auth-service';
import { GettingStartedCard } from './getting-started-card';
import type { GettingStartedStep } from './services/getting-started.service';
import { GettingStartedService } from './services/getting-started.service';

describe('GettingStartedCard', () => {
  let fixture: ComponentFixture<GettingStartedCard>;
  let userSignal: ReturnType<typeof signal<{ tenant_demo_mode_at: Date | null } | null>>;
  let svcVisible: ReturnType<typeof signal<boolean>>;
  let mockSvc: {
    visible: () => boolean;
    steps: () => GettingStartedStep[];
    doneCount: () => number;
    total: () => number;
    nextStep: () => GettingStartedStep | null;
    refresh: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };
  let mockAlerts: { showInfo: ReturnType<typeof vi.fn> };

  const steps: GettingStartedStep[] = [
    {
      id: 'import',
      label: 'Import your contacts',
      done: true,
      evidence: '12 imported',
      route: '/imports',
      cta: 'Import contacts',
    },
    {
      id: 'verify-sender',
      label: 'Verify a sending address',
      done: false,
      evidence: null,
      route: '/workspace/communications',
      cta: 'Verify a sending address',
    },
  ];

  function createCard(demo: boolean): void {
    userSignal = signal<{ tenant_demo_mode_at: Date | null } | null>({
      tenant_demo_mode_at: demo ? new Date() : null,
    });
    fixture = TestBed.createComponent(GettingStartedCard);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    svcVisible = signal(true);
    mockSvc = {
      visible: () => svcVisible(),
      steps: () => steps,
      doneCount: () => 1,
      total: () => steps.length,
      nextStep: () => steps[1] ?? null,
      refresh: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn(),
    };
    mockAlerts = { showInfo: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GettingStartedCard],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getUserSignal: () => userSignal } },
        { provide: GettingStartedService, useValue: mockSvc },
        { provide: AlertService, useValue: mockAlerts },
      ],
    }).compileComponents();
  });

  it('shows the checklist and refreshes when the tenant is not in demo mode', () => {
    createCard(false);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Getting started');
    expect(mockSvc.refresh).toHaveBeenCalledTimes(1);
  });

  it('stays hidden and does not fetch while the tenant is in demo mode', () => {
    createCard(true);

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Getting started');
    expect(mockSvc.refresh).not.toHaveBeenCalled();
  });

  it('appears and fetches fresh counts once the demo flag clears', () => {
    createCard(true);
    expect(mockSvc.refresh).not.toHaveBeenCalled();

    userSignal.set({ tenant_demo_mode_at: null });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Getting started');
    expect(mockSvc.refresh).toHaveBeenCalledTimes(1);
  });

  it('dismiss hides via the service and confirms with a toast', () => {
    createCard(false);

    const dismissBtn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Dismiss'),
    );
    dismissBtn?.click();

    expect(mockSvc.dismiss).toHaveBeenCalledTimes(1);
    expect(mockAlerts.showInfo).toHaveBeenCalledTimes(1);
  });
});
