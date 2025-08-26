import { buildGridCallbacks } from '../datagrid.callbacks';

describe('datagrid.callbacks', () => {
  test('returns bound callbacks', () => {
    const ctx = {
      onCellValueChanged: jest.fn(),
      onCellMouseOver: jest.fn(),
      onSelectionChanged: jest.fn(),
      updateUndoSizes: jest.fn(),
    } as any;

    const cb = buildGridCallbacks(ctx);
    expect(cb.onCellValueChanged).toBeDefined();
    expect(cb.onCellMouseOver).toBeDefined();
    expect(cb.onSelectionChanged).toBeDefined();
    expect(cb.onUndoEnded).toBe(ctx.updateUndoSizes);
    expect(cb.onRedoEnded).toBe(ctx.updateUndoSizes);
  });
});
