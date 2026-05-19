import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListsGridComponent } from './lists-grid';
import { ListsRefreshService } from '@experiences/lists/services/lists-refresh.service';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { Subject } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { DATA_GRID_CONFIG } from '@uxcommon/components/datagrid/datagrid.tokens';
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockApiService {
  refresh$ = new Subject<void>();
  getAll = vi.fn().mockResolvedValue({ rows: [], totalCount: 0 });
  abort = vi.fn();
}

describe('ListsGridComponent', () => {
  let component: ListsGridComponent;
  let fixture: ComponentFixture<ListsGridComponent>;

  let mockRefreshSvc: any;
  let mockApiSvc: any;
  let refreshSubject: Subject<void>;

  beforeEach(async () => {
    refreshSubject = new Subject<void>();
    
    mockRefreshSvc = {
      changes$: refreshSubject.asObservable()
    };

    mockApiSvc = {
      // DataGrid requires these basic methods
      getAll: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
      refresh$: new Subject()
    };

    await TestBed.configureTestingModule({
      imports: [ListsGridComponent],
      providers: [
        provideRouter([]),
        
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: DATA_GRID_CONFIG, useValue: { messages: { loadFailed: 'Failed to load' } } },
        { provide: ListsRefreshService, useValue: mockRefreshSvc },
        { provide: AbstractAPIService, useValue: mockApiSvc }
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
    const formatter = listSizeCol?.valueFormatter as Function;

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

  it('should subscribe to refresh service on init and trigger refresh', async () => {
    vi.spyOn(component, 'refresh').mockImplementation(() => {});
    
    await component.ngOnInit();
    
    refreshSubject.next(); // Trigger the observable
    
    expect(component.refresh).toHaveBeenCalled();
  });

  it('should unsubscribe on destroy', async () => {
    await component.ngOnInit();
    
    expect(component['sub']).toBeDefined();
    const unsubscribeSpy = vi.spyOn(component['sub'] as any, 'unsubscribe');
    
    component.ngOnDestroy();
    
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
