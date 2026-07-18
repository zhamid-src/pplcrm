import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { WorkflowsGridComponent } from './workflows-grid';
import { WorkflowsService } from '../services/workflows-service';

class MockWorkflowsService {
  list = vi.fn().mockResolvedValue({ rows: [], summary: { total: 0, active: 0, runs30d: 0 } });
  setStatus = vi.fn().mockResolvedValue({ success: true, status: 'paused' });
  triggerRefresh = vi.fn();
  abort = vi.fn();
  refreshCount = signal(0);
}

const alertStub = { showSuccess: vi.fn(), showError: vi.fn() };

describe('WorkflowsGridComponent', () => {
  let component: WorkflowsGridComponent;
  let fixture: ComponentFixture<WorkflowsGridComponent>;
  let svc: MockWorkflowsService;

  beforeEach(async () => {
    svc = new MockWorkflowsService();
    await TestBed.configureTestingModule({
      imports: [WorkflowsGridComponent],
      providers: [provideRouter([]), { provide: AlertService, useValue: alertStub }],
    })
      // The list component provides its own WorkflowsService — override it with the mock.
      .overrideComponent(WorkflowsGridComponent, {
        set: { providers: [{ provide: WorkflowsService, useValue: svc }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(WorkflowsGridComponent);
    component = fixture.componentInstance;
  });

  it('should build the summary sentence from the loaded summary', async () => {
    svc.list.mockResolvedValue({ rows: [], summary: { total: 6, active: 4, runs30d: 1847 } });
    await component['load']();
    expect(component['summarySentence']()).toBe('6 automations · 4 active · 1,847 runs in the last 30 days');
  });

  it('should build a recipe sentence from trigger + steps', async () => {
    await component['load']();
    const row = {
      id: '1',
      name: 'Volunteer follow-up',
      trigger_type: 'web_form_submitted',
      status: 'active',
      conditions: null,
      steps: [{ kind: 'add_tag', config: { tag_name: 'volunteer' }, delay_days: 0, delay_unit: 'days', subject: null }],
      runs_30d: 0,
      last_run_at: null,
      last_run_status: null,
      last_run_error: null,
    };
    expect(component['recipe'](row as never)).toBe('When form submitted → add tag volunteer');
  });

  it('should optimistically flip status and call setStatus on toggle', async () => {
    svc.list.mockResolvedValue({
      rows: [
        {
          id: '9',
          name: 'X',
          trigger_type: 'manual',
          status: 'active',
          conditions: null,
          steps: [],
          runs_30d: 0,
          last_run_at: null,
          last_run_status: null,
          last_run_error: null,
        },
      ],
      summary: { total: 1, active: 1, runs30d: 0 },
    });
    await component['load']();

    await component['toggleStatus'](component['rows']()[0] as never, new Event('change'));

    expect(svc.setStatus).toHaveBeenCalledWith('9', 'paused');
    expect(component['rows']()[0].status).toBe('paused');
  });

  it('should revert the optimistic status flip and toast when setStatus fails', async () => {
    svc.list.mockResolvedValue({
      rows: [
        {
          id: '9',
          name: 'X',
          trigger_type: 'manual',
          status: 'active',
          conditions: null,
          steps: [],
          runs_30d: 0,
          last_run_at: null,
          last_run_status: null,
          last_run_error: null,
        },
      ],
      summary: { total: 1, active: 1, runs30d: 0 },
    });
    svc.setStatus.mockRejectedValue(new Error('server said no'));
    await component['load']();

    await component['toggleStatus'](component['rows']()[0] as never, new Event('change'));

    expect(component['rows']()[0].status).toBe('active'); // optimistic flip rolled back
    expect(alertStub.showError).toHaveBeenCalledWith('Could not change the automation status. Please try again.');
    expect(svc.triggerRefresh).not.toHaveBeenCalled();
  });
});
