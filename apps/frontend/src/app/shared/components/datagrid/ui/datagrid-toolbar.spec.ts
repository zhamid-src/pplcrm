import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { DataGridToolbarComponent } from './datagrid-toolbar';
import { DataGrid } from '../datagrid';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('DataGridToolbarComponent', () => {
  let component: DataGridToolbarComponent;
  let fixture: ComponentFixture<DataGridToolbarComponent>;
  let mockDataGrid: any;

  beforeEach(async () => {
    mockDataGrid = {
      doAdd: vi.fn(),
      doConfirmDelete: vi.fn(),
      doConfirmExport: vi.fn(),
      hideAllColsPublic: vi.fn(),
      doImportCSV: vi.fn(),
      redo: vi.fn(),
      doRefresh: vi.fn(),
      resetAllWidthsPublic: vi.fn(),
      showAllColsPublic: vi.fn(),
      toggleArchiveModePublic: vi.fn(),
      toggleColPublic: vi.fn(),
      filter: vi.fn(),
      undo: vi.fn(),
      // Tag filter mocks
      showTagFilter: vi.fn().mockReturnValue(false),
      selectedTags: vi.fn().mockReturnValue([]),
      clearTagsFilter: vi.fn(),
      tagSearchQuery: vi.fn().mockReturnValue(''),
      filteredAvailableTags: vi.fn().mockReturnValue([]),
      selectAllTags: vi.fn(),
      clearAllTagsVisible: vi.fn(),
      toggleTagFilter: vi.fn(),
      // Columns mocks
      getColDefsForToolbar: vi.fn().mockReturnValue([]),
      getColVisibilityMap: vi.fn().mockReturnValue({}),
    };

    await TestBed.configureTestingModule({
      imports: [DataGridToolbarComponent],
      providers: [{ provide: DataGrid, useValue: mockDataGrid }],
    }).compileComponents();

    fixture = TestBed.createComponent(DataGridToolbarComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should delegate onAdd to grid.doAdd', () => {
    component.onAdd();
    expect(mockDataGrid.doAdd).toHaveBeenCalled();
  });

  it('should delegate onDeleteSelected to grid.doConfirmDelete', () => {
    component.onDeleteSelected();
    expect(mockDataGrid.doConfirmDelete).toHaveBeenCalled();
  });

  it('should delegate onExportCsv to grid.doConfirmExport', () => {
    component.onExportCsv();
    expect(mockDataGrid.doConfirmExport).toHaveBeenCalled();
  });

  it('should delegate onHideAllCols to grid.hideAllColsPublic', () => {
    component.onHideAllCols();
    expect(mockDataGrid.hideAllColsPublic).toHaveBeenCalled();
  });

  it('should delegate onImportCsv to grid.doImportCSV', () => {
    component.onImportCsv();
    expect(mockDataGrid.doImportCSV).toHaveBeenCalled();
  });

  it('should delegate onRedo to grid.redo', () => {
    component.onRedo();
    expect(mockDataGrid.redo).toHaveBeenCalled();
  });

  it('should delegate onRefresh to grid.doRefresh', () => {
    component.onRefresh();
    expect(mockDataGrid.doRefresh).toHaveBeenCalled();
  });

  it('should delegate onResetAllWidths to grid.resetAllWidthsPublic', () => {
    component.onResetAllWidths();
    expect(mockDataGrid.resetAllWidthsPublic).toHaveBeenCalled();
  });

  it('should delegate onShowAllCols to grid.showAllColsPublic', () => {
    component.onShowAllCols();
    expect(mockDataGrid.showAllColsPublic).toHaveBeenCalled();
  });

  it('should delegate onToggleArchive to grid.toggleArchiveModePublic', () => {
    component.onToggleArchive();
    expect(mockDataGrid.toggleArchiveModePublic).toHaveBeenCalled();
  });

  it('should delegate onToggleCol to grid.toggleColPublic', () => {
    component.onToggleCol('firstName', true);
    expect(mockDataGrid.toggleColPublic).toHaveBeenCalledWith('firstName', true);
  });

  it('should delegate onToggleFilters to grid.filter', () => {
    component.onToggleFilters();
    expect(mockDataGrid.filter).toHaveBeenCalled();
  });

  it('should delegate onUndo to grid.undo', () => {
    component.onUndo();
    expect(mockDataGrid.undo).toHaveBeenCalled();
  });
});
