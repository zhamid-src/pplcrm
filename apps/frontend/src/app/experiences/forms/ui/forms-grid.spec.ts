import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { DATA_GRID_CONFIG } from '@frontend/shared/components/datagrid/datagrid.tokens';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { StandardFormsService } from '@experiences/forms/services/standard-forms-service';
import { FormsGridComponent } from './forms-grid';

class MockStandardFormsService {
  refreshCount = signal(0);
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
}

describe('FormsGridComponent', () => {
  let component: FormsGridComponent;
  let fixture: ComponentFixture<FormsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsGridComponent],
      providers: [
        provideRouter([]),
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: AlertService, useValue: { showSuccess: vi.fn(), showError: vi.fn() } },
        {
          provide: DATA_GRID_CONFIG,
          useValue: { messages: { exportEntity: 'forms', exportFileName: 'forms-export.csv' } },
        },
        { provide: AbstractAPIService, useValue: new MockStandardFormsService() },
        { provide: TagOptionsService, useValue: { getTagNames: vi.fn().mockResolvedValue([]) } },
      ],
    })
      .overrideProvider(StandardFormsService, { useValue: new MockStandardFormsService() })
      .compileComponents();

    fixture = TestBed.createComponent(FormsGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and define the web-forms column set', () => {
    expect(component).toBeTruthy();
    expect(component['col']).toHaveLength(5);
    expect(component['col'].map((c) => c.field)).toEqual([
      'name',
      'description',
      'redirect_url',
      'status',
      'created_at',
    ]);
  });

  it('should format created_at as a localized date string, or empty when absent', () => {
    const formatter = component['col'].find((c) => c.field === 'created_at')?.valueFormatter;
    if (typeof formatter !== 'function') {
      throw new Error('created_at column has no valueFormatter function');
    }

    const iso = '2024-06-15T00:00:00Z';
    expect(formatter({ value: iso } as never)).toBe(new Date(iso).toLocaleDateString());
    expect(formatter({ value: null } as never)).toBe('');
  });

  it('should mark the status column as editable and name/description as not', () => {
    expect(component['col'].find((c) => c.field === 'status')?.editable).toBe(true);
    expect(component['col'].find((c) => c.field === 'name')?.editable).toBe(false);
    expect(component['col'].find((c) => c.field === 'description')?.editable).toBe(false);
  });
});
