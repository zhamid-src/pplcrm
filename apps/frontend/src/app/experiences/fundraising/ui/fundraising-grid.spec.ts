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
import { DonationPagesService } from '@experiences/forms/services/donation-pages-service';
import { FundraisingGridComponent } from './fundraising-grid';

class MockDonationPagesService {
  refreshCount = signal(0);
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
}

describe('FundraisingGridComponent', () => {
  let component: FundraisingGridComponent;
  let fixture: ComponentFixture<FundraisingGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundraisingGridComponent],
      providers: [
        provideRouter([]),
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: AlertService, useValue: { showSuccess: vi.fn(), showError: vi.fn() } },
        {
          provide: DATA_GRID_CONFIG,
          useValue: { messages: { exportEntity: 'forms', exportFileName: 'donation-pages-export.csv' } },
        },
        { provide: AbstractAPIService, useValue: new MockDonationPagesService() },
        { provide: TagOptionsService, useValue: { getTagNames: vi.fn().mockResolvedValue([]) } },
      ],
    })
      // The component's own `providers` array wires AbstractAPIService to the real
      // DonationPagesService via `useExisting`; override that token so the datagrid
      // it hosts resolves to a lightweight mock instead of a real tRPC-backed service.
      .overrideProvider(DonationPagesService, { useValue: new MockDonationPagesService() })
      .compileComponents();

    fixture = TestBed.createComponent(FundraisingGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and define the donation-page column set', () => {
    expect(component).toBeTruthy();
    expect(component['col']).toHaveLength(5);
    expect(component['col'].map((c) => c.field)).toEqual(['name', 'description', 'form_type', 'status', 'created_at']);
  });

  function getFormatter(field: string) {
    const formatter = component['col'].find((c) => c.field === field)?.valueFormatter;
    if (typeof formatter !== 'function') {
      throw new Error(`Column "${field}" has no valueFormatter function`);
    }
    return formatter;
  }

  it('should format the form_type column as Recurring vs One-Time', () => {
    const formatter = getFormatter('form_type');
    expect(formatter({ value: 'recurring_donation' } as never)).toBe('Recurring');
    expect(formatter({ value: 'donation' } as never)).toBe('One-Time');
  });

  it('should format created_at as a localized date string, or empty when absent', () => {
    const formatter = getFormatter('created_at');
    const iso = '2024-05-01T00:00:00Z';
    expect(formatter({ value: iso } as never)).toBe(new Date(iso).toLocaleDateString());
    expect(formatter({ value: null } as never)).toBe('');
  });
});
