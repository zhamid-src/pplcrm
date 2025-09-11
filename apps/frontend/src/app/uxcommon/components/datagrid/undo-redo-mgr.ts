import { computed, signal } from '@angular/core';

/**
 * An undo/redo manager stub for the datagrid.
 * Currently tracks sizes via signals; integration points are no-ops.
 */
export class UndoManager {
  private readonly redoSize = signal(0);
  private readonly undoSize = signal(0);

  public readonly canRedo = computed(() => this.redoSize() > 0);
  public readonly canUndo = computed(() => this.undoSize() > 0);

  /**
   * Returns the number of redo actions in the stack.
   */
  public getRedoSize(): number {
    return 0;
  }

  /**
   * Returns the number of redo actions in the stack.
   */
  public getUndoSize(): number {
    return 0;
  }

  /** Initialize tracking hooks (no external API required). */
  public initialize(_api: any): void {
    this.updateSizes();
  }

  /** Redo (not implemented). */
  public redo() {
    // no-op
  }

  /** Undo (not implemented). */
  public undo() {
    // no-op
  }

  public updateSizes() {
    this.undoSize.set(this.getUndoSize());
    this.redoSize.set(this.getRedoSize());
  }
}
