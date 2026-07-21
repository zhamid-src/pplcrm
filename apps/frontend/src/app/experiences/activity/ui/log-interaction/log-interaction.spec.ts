import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ActivityService } from '@experiences/activity/services/activity.service';
import { LogInteraction } from './log-interaction';

describe('LogInteraction', () => {
  let fixture: ComponentFixture<LogInteraction>;
  let component: LogInteraction;
  let mockActivitySvc: { logInteraction: ReturnType<typeof vi.fn> };
  let mockAlertSvc: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockActivitySvc = { logInteraction: vi.fn().mockResolvedValue(undefined) };
    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LogInteraction],
      providers: [
        { provide: ActivityService, useValue: mockActivitySvc },
        { provide: AlertService, useValue: mockAlertSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogInteraction);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entity', 'persons');
    fixture.componentRef.setInput('entityId', 'p-1');
    fixture.detectChanges();
  });

  it('offers all four interaction types', () => {
    expect(component['options'].map((o) => o.value)).toEqual(['call', 'door_knock', 'note', 'meeting']);
  });

  it('opens the note modal when a type is chosen', () => {
    component['choose'](component['options'][0]!);
    expect(component['open']()).toBe(true);
    expect(component['selected']()?.value).toBe('call');
  });

  it('logs the chosen interaction, toasts, closes, and emits', async () => {
    const emitted = vi.fn();
    component.logged.subscribe(emitted);

    component['choose'](component['options'][1]!); // door_knock
    component['note'].set('spoke at the door');
    await component['save']();

    expect(mockActivitySvc.logInteraction).toHaveBeenCalledWith({
      entity: 'persons',
      entityId: 'p-1',
      type: 'door_knock',
      note: 'spoke at the door',
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalled();
    expect(component['open']()).toBe(false);
    expect(emitted).toHaveBeenCalled();
  });

  it('surfaces an error toast and stays open when logging fails', async () => {
    mockActivitySvc.logInteraction.mockRejectedValueOnce(new Error('boom'));
    component['choose'](component['options'][0]!);
    await component['save']();

    expect(mockAlertSvc.showError).toHaveBeenCalled();
  });
});
