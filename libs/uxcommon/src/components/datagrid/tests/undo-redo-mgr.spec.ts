import { signal } from '@angular/core';
import { UndoManager } from '../undo-redo-mgr';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UndoManager', () => {
  let undoMgr: UndoManager;
  let mockGrid: any;
  let mockStore: any;
  let mockGridSvc: any;

  beforeEach(() => {
    undoMgr = new UndoManager();

    mockStore = {
      rows: signal<any[]>([]),
      selectedIdSet: signal<Set<string>>(new Set()),
      filterValues: signal<Record<string, any>>({}),
      sorting: signal<any[]>([]),
      pageIndex: signal<number>(0),
      pageSize: signal<number>(25),
    };

    mockGridSvc = {
      update: vi.fn().mockResolvedValue({}),
    };

    mockGrid = {
      store: mockStore,
      gridSvc: mockGridSvc,
      startIndex: vi.fn().mockReturnValue(0),
      endIndex: vi.fn().mockReturnValue(25),
      updateTableWindow: vi.fn(),
      alertSvc: {
        showSuccess: vi.fn(),
        showError: vi.fn(),
      },
    };

    undoMgr.initialize(mockGrid);
  });

  it('should initialize with empty stacks and correct signal defaults', () => {
    expect(undoMgr.canUndo()).toBe(false);
    expect(undoMgr.canRedo()).toBe(false);
    expect(undoMgr.getUndoSize()).toBe(0);
    expect(undoMgr.getRedoSize()).toBe(0);
  });

  it('should push snapshot to undo stack and update sizes', () => {
    const snap = {
      rows: [{ id: '1', name: 'John' }],
      selectedIdSet: new Set<string>(),
      filterValues: {},
      sorting: [],
      pageIndex: 0,
      pageSize: 25,
    };
    undoMgr.pushUndo(snap);

    expect(undoMgr.canUndo()).toBe(true);
    expect(undoMgr.canRedo()).toBe(false);
    expect(undoMgr.getUndoSize()).toBe(1);
    expect(undoMgr.getRedoSize()).toBe(0);
  });

  it('should cap undo stack at 50 elements', () => {
    for (let i = 0; i < 55; i++) {
      undoMgr.pushUndo({
        rows: [{ id: '1', name: `Name ${i}` }],
        selectedIdSet: new Set<string>(),
        filterValues: {},
        sorting: [],
        pageIndex: 0,
        pageSize: 25,
      });
    }

    expect(undoMgr.getUndoSize()).toBe(50);
  });

  it('should restore previous state and call gridSvc.update on undo (fallback diff path)', async () => {
    // Initial state
    mockStore.rows.set([{ id: '1', name: 'John' }]);

    // Push initial snapshot without editMeta
    const originalSnap = {
      rows: [{ id: '1', name: 'John' }],
      selectedIdSet: new Set<string>(),
      filterValues: {},
      sorting: [],
      pageIndex: 0,
      pageSize: 25,
    };
    undoMgr.pushUndo(originalSnap);

    // Edit state
    mockStore.rows.set([{ id: '1', name: 'Johnny' }]);

    // Undo should restore original rows and update backend
    await undoMgr.undo();

    expect(mockGridSvc.update).toHaveBeenCalledWith('1', { name: 'John' });
    expect(mockStore.rows()).toEqual([{ id: '1', name: 'John' }]);
    expect(undoMgr.canUndo()).toBe(false);
    expect(undoMgr.canRedo()).toBe(true);
    expect(undoMgr.getRedoSize()).toBe(1);
  });

  it('should restore previous state and call gridSvc.update on undo (editMeta path)', async () => {
    // Initial state
    mockStore.rows.set([{ id: '1', name: 'John' }]);

    // Push initial snapshot with editMeta
    const originalSnap = {
      rows: [{ id: '1', name: 'John' }],
      selectedIdSet: new Set<string>(),
      filterValues: {},
      sorting: [],
      pageIndex: 0,
      pageSize: 25,
      editMeta: {
        id: '1',
        field: 'name',
        prevValue: 'John',
        newValue: 'Johnny',
      },
    };
    undoMgr.pushUndo(originalSnap);

    // Edit state (e.g. page changed or data updated, simulate navigation/different page rows)
    mockStore.rows.set([{ id: '2', name: 'Alice' }]);

    // Undo should restore original rows and update backend using metadata, even with row mismatches
    await undoMgr.undo();

    expect(mockGridSvc.update).toHaveBeenCalledWith('1', { name: 'John' });
    expect(mockStore.rows()).toEqual([{ id: '1', name: 'John' }]);
  });

  it('should re-apply change and call gridSvc.update on redo', async () => {
    // Initial state
    mockStore.rows.set([{ id: '1', name: 'John' }]);

    const originalSnap = {
      rows: [{ id: '1', name: 'John' }],
      selectedIdSet: new Set<string>(),
      filterValues: {},
      sorting: [],
      pageIndex: 0,
      pageSize: 25,
      editMeta: {
        id: '1',
        field: 'name',
        prevValue: 'John',
        newValue: 'Johnny',
      },
    };
    undoMgr.pushUndo(originalSnap);

    // Edit state
    mockStore.rows.set([{ id: '1', name: 'Johnny' }]);

    // Perform Undo
    await undoMgr.undo();
    expect(mockStore.rows()).toEqual([{ id: '1', name: 'John' }]);
    mockGridSvc.update.mockClear();

    // Perform Redo
    await undoMgr.redo();
    expect(mockGridSvc.update).toHaveBeenCalledWith('1', { name: 'Johnny' });
    expect(mockStore.rows()).toEqual([{ id: '1', name: 'Johnny' }]);
    expect(undoMgr.canUndo()).toBe(true);
    expect(undoMgr.canRedo()).toBe(false);
  });

  it('should call triggerRowFlash on the grid if available during undo and redo', async () => {
    mockGrid.triggerRowFlash = vi.fn();

    // Initial state
    mockStore.rows.set([{ id: '1', name: 'John' }]);

    const originalSnap = {
      rows: [{ id: '1', name: 'John' }],
      selectedIdSet: new Set<string>(),
      filterValues: {},
      sorting: [],
      pageIndex: 0,
      pageSize: 25,
      editMeta: {
        id: '1',
        field: 'name',
        prevValue: 'John',
        newValue: 'Johnny',
      },
    };
    undoMgr.pushUndo(originalSnap);

    // Edit state
    mockStore.rows.set([{ id: '1', name: 'Johnny' }]);

    // Undo
    await undoMgr.undo();
    expect(mockGrid.triggerRowFlash).toHaveBeenCalledWith('1');
    mockGrid.triggerRowFlash.mockClear();

    // Redo
    await undoMgr.redo();
    expect(mockGrid.triggerRowFlash).toHaveBeenCalledWith('1');
  });
});
