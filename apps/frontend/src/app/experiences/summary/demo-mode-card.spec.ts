import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../auth/auth-service';
import { ConfirmDialogService } from '../../services/shared-dialog.service';
import { DemoModeCard } from './demo-mode-card';
import { DemoService } from './services/demo.service';

describe('DemoModeCard', () => {
  let fixture: ComponentFixture<DemoModeCard>;
  let userSignal: ReturnType<typeof signal<{ tenant_demo_mode_at: Date | null } | null>>;
  let mockDemoSvc: { exitDemo: ReturnType<typeof vi.fn> };
  let mockAuth: { getUserSignal: () => unknown; getCurrentUser: ReturnType<typeof vi.fn> };
  let mockAlerts: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let mockDialogs: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userSignal = signal<{ tenant_demo_mode_at: Date | null } | null>({ tenant_demo_mode_at: new Date() });
    mockDemoSvc = { exitDemo: vi.fn().mockResolvedValue({ success: true }) };
    mockAuth = { getUserSignal: () => userSignal, getCurrentUser: vi.fn().mockResolvedValue(null) };
    mockAlerts = { showSuccess: vi.fn(), showError: vi.fn() };
    mockDialogs = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DemoModeCard],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: DemoService, useValue: mockDemoSvc },
        { provide: AlertService, useValue: mockAlerts },
        { provide: ConfirmDialogService, useValue: mockDialogs },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoModeCard);
    fixture.detectChanges();
  });

  const exitButton = (): HTMLButtonElement | null => (fixture.nativeElement as HTMLElement).querySelector('button');

  it('is visible while the tenant demo flag is set', () => {
    expect(exitButton()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Demo mode');
  });

  it('hides when the tenant is not in demo mode', () => {
    userSignal.set({ tenant_demo_mode_at: null });
    fixture.detectChanges();
    expect(exitButton()).toBeNull();
  });

  it('confirm-accept exits demo, refreshes the session, and emits exited', async () => {
    const exited = vi.fn();
    fixture.componentInstance.exited.subscribe(exited);

    exitButton()?.click();
    await fixture.whenStable();

    expect(mockDialogs.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger' }));
    expect(mockDemoSvc.exitDemo).toHaveBeenCalledTimes(1);
    expect(mockAuth.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockAlerts.showSuccess).toHaveBeenCalledTimes(1);
    expect(exited).toHaveBeenCalledTimes(1);
  });

  it('confirm-cancel changes nothing', async () => {
    mockDialogs.confirm.mockResolvedValue(false);

    exitButton()?.click();
    await fixture.whenStable();

    expect(mockDemoSvc.exitDemo).not.toHaveBeenCalled();
    expect(mockAuth.getCurrentUser).not.toHaveBeenCalled();
    expect(mockAlerts.showSuccess).not.toHaveBeenCalled();
  });

  it('shows an error toast when the mutation fails', async () => {
    mockDemoSvc.exitDemo.mockRejectedValue(new Error('boom'));

    exitButton()?.click();
    await fixture.whenStable();

    expect(mockAlerts.showError).toHaveBeenCalledTimes(1);
    expect(mockAuth.getCurrentUser).not.toHaveBeenCalled();
  });
});
