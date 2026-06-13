import { TestBed } from '@angular/core/testing';
import { TagsGridComponent } from './tags-grid';
import { provideRouter } from '@angular/router';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { DATA_GRID_CONFIG } from '@uxcommon/components/datagrid/datagrid.tokens';
import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockApiService {
  refreshCount = signal(0);
  getAll = vi.fn().mockResolvedValue({ rows: [], totalCount: 0 });
  abort = vi.fn();
}

describe('TagsGridComponent', () => {
  let component: TagsGridComponent;

  beforeEach(() => {
    // We only test the unit-level methods of TagsGridComponent itself,
    // DataGrid is tested separately. So we can just instantiate it directly.
    TestBed.configureTestingModule({
      imports: [TagsGridComponent],
      providers: [
        provideRouter([]),

        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: DATA_GRID_CONFIG, useValue: { messages: { loadFailed: 'Failed to load' } } },
      ],
    })
      .overrideComponent(TagsGridComponent, {
        set: { providers: [{ provide: AbstractAPIService, useClass: MockApiService }] },
      })
      .compileComponents();

    component = TestBed.createComponent(TagsGridComponent).componentInstance;
  });

  it('should initialize with correct columns', () => {
    expect(component['col']).toBeDefined();
    expect(component['col'].length).toBe(6);
    expect(component['col'][0].field).toBe('name');
    expect(component['col'][0].editable).toBe(true);
    expect(component['col'][2].cellDataType).toBe('color');
  });

  describe('renderColorCell', () => {
    it('should render a pill when a valid hex color is provided', () => {
      const html = component['renderColorCell']('#ff0000');
      expect(html).toContain('background-color:#ff0000');
      expect(html).toContain('title="#ff0000"');
    });

    it('should handle short hex colors', () => {
      const html = component['renderColorCell']('#fff');
      expect(html).toContain('background-color:#fff');
    });

    it('should render "None" for invalid or missing colors', () => {
      expect(component['renderColorCell']('invalid')).toContain('None');
      expect(component['renderColorCell'](null)).toContain('None');
      expect(component['renderColorCell']('')).toContain('None');
      expect(component['renderColorCell']('#12345')).toContain('None'); // invalid length
    });

    it('should extract color from the column definition renderer parameters', () => {
      const colorDef = component['col'].find((c) => c.field === 'color');
      const renderer = colorDef?.cellRenderer as (params: any) => string;

      const htmlFromValue = renderer({ value: '#00ff00' });
      expect(htmlFromValue).toContain('#00ff00');

      const htmlFromData = renderer({ data: { color: '#0000ff' } });
      expect(htmlFromData).toContain('#0000ff');
    });
  });
});
