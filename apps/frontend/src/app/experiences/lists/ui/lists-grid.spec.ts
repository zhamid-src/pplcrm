import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListsGridComponent } from './lists-grid';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { TagOptionsService } from '@uxcommon/components/datagrid/services/tag-options.service';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { DATA_GRID_CONFIG } from '@uxcommon/components/datagrid/datagrid.tokens';
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockApiService {
  refreshCount = signal(0);
  getAll = vi.fn().mockResolvedValue({ rows: [], totalCount: 0 });
  abort = vi.fn();
}

describe('ListsGridComponent', () => {
  let component: ListsGridComponent;
  let fixture: ComponentFixture<ListsGridComponent>;

  let mockRefreshSvc: any;
  let mockApiSvc: any;
  let mockTagOptionsSvc: any;
  let refreshCount: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    refreshCount = signal(0);

    mockRefreshSvc = {
      refreshCount
    };

    mockApiSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
      refreshCount: signal(0),
    };

    mockTagOptionsSvc = {
      getTagNames: vi.fn().mockResolvedValue(['tag1', 'tag2']),
    };

    await TestBed.configureTestingModule({
      imports: [ListsGridComponent],
      providers: [
        provideRouter([]),
        
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: DATA_GRID_CONFIG, useValue: { messages: { loadFailed: 'Failed to load' } } },
        { provide: ListsRefreshService, useValue: mockRefreshSvc },
        { provide: AbstractAPIService, useValue: mockApiSvc },
        { provide: TagOptionsService, useValue: mockTagOptionsSvc },
      ]
    })
    .overrideComponent(ListsGridComponent, { set: { providers: [{ provide: AbstractAPIService, useClass: MockApiService }] } }) // Override component provider
    .compileComponents();

    fixture = TestBed.createComponent(ListsGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and initialize columns', () => {
    expect(component).toBeTruthy();
    expect(component['col']).toBeDefined();
    expect(component['col'].length).toBe(8);
  });

  it('should format list_size correctly for dynamic vs static lists', () => {
    const listSizeCol = component['col'].find(c => c.field === 'list_size');
    const formatter = listSizeCol?.valueFormatter as (params: any) => any;

    expect(formatter).toBeDefined();

    // Dynamic list
    expect(formatter({ data: { is_dynamic: true }, value: 10 })).toBe('N/A');
    expect(formatter({ data: { is_dynamic: 'true' }, value: 5 })).toBe('N/A');
    expect(formatter({ data: { is_dynamic: 1 }, value: 0 })).toBe('N/A');

    // Static list
    expect(formatter({ data: { is_dynamic: false }, value: 42 })).toBe(42);
    expect(formatter({ data: { is_dynamic: 0 }, value: 15 })).toBe(15);
    expect(formatter({ data: {}, value: null })).toBe(0);
  });

  it('should call refresh when refreshCount signal increments', async () => {
    vi.spyOn(component as any, 'refresh').mockImplementation(vi.fn());

    await component.ngOnInit();

    // Simulate a refresh trigger via the signal
    refreshCount.update((n) => n + 1);
    // Effect runs asynchronously; flush microtasks
    await fixture.whenStable();

    expect((component as any).refresh).toHaveBeenCalled();
  });

  it('should not call refresh on initial render (refreshCount === 0)', async () => {
    vi.spyOn(component as any, 'refresh').mockImplementation(vi.fn());

    await component.ngOnInit();

    // No trigger — refreshCount stays 0
    expect((component as any).refresh).not.toHaveBeenCalled();
  });
});
