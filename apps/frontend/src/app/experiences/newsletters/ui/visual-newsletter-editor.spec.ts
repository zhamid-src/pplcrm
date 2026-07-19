import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { VisualNewsletterEditorComponent } from './visual-newsletter-editor';
import { getTemplateBlocks, type EmailBlock } from './newsletter-templates';

describe('VisualNewsletterEditorComponent', () => {
  let component: VisualNewsletterEditorComponent;
  let fixture: ComponentFixture<VisualNewsletterEditorComponent>;

  async function createComponent(htmlContent = ''): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [VisualNewsletterEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VisualNewsletterEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('htmlContent', htmlContent);
    fixture.detectChanges();
  }

  describe('ngOnInit', () => {
    it('should load the default welcome template without propagating changes when content is empty', async () => {
      await createComponent('');

      expect(component['blocks']()).toHaveLength(getTemplateBlocks('welcome').length);
      expect(component['activeTab']()).toBe('edit');
      // loadTemplate is called with triggerPropagate=false on init, so the
      // model outputs should remain untouched.
      expect(component.htmlContent()).toBe('');
    });

    it('should restore blocks embedded as JSON metadata in existing HTML', async () => {
      const blocks: EmailBlock[] = [
        { id: 'custom-1', type: 'heading', content: 'Restored', styles: { textAlign: 'left' } },
      ];
      const encoded = encodeURIComponent(JSON.stringify(blocks));
      const html = `<html><body>...<!-- PPLCRM_VISUAL_BLOCKS_DATA: ${encoded} --></body></html>`;

      await createComponent(html);

      expect(component['blocks']()).toEqual(blocks);
      expect(component['selectedBlockId']()).toBe('custom-1');
      expect(component['activeTab']()).toBe('edit');
    });

    it('should switch to code mode for legacy HTML without embedded metadata', async () => {
      const legacyHtml = `<html><body>${'<p>Legacy content</p>'.repeat(10)}</body></html>`;

      await createComponent(legacyHtml);

      expect(component['editorMode']()).toBe('code');
    });
  });

  describe('block management', () => {
    beforeEach(async () => {
      await createComponent('');
    });

    it('should add a new heading block right after the selected block and select it', () => {
      const before = component['blocks']().length;
      // ngOnInit selected the first template block, so the insert lands at index 1.
      expect(component['selectedBlockId']()).toBe(component['blocks']()[0]?.id);

      component['addBlock']('heading');

      const blocks = component['blocks']();
      expect(blocks).toHaveLength(before + 1);
      const added = blocks.at(1);
      expect(added?.type).toBe('heading');
      expect(added?.content).toBe('Heading Title');
      expect(component['selectedBlockId']()).toBe(added?.id);
    });

    it('should append the new block when no block is selected', () => {
      const before = component['blocks']().length;
      component['selectedBlockId'].set(null);

      component['addBlock']('button');

      const blocks = component['blocks']();
      expect(blocks).toHaveLength(before + 1);
      expect(blocks.at(-1)?.type).toBe('button');
      expect(component['selectedBlockId']()).toBe(blocks.at(-1)?.id);
    });

    it('should insert a block at an explicit index, select it, and close the insert menu', () => {
      const before = component['blocks']().map((b) => b.id);
      component['insertMenuIndex'].set(1);

      component['addBlockAt']('divider', 1);

      const blocks = component['blocks']();
      expect(blocks).toHaveLength(before.length + 1);
      expect(blocks.at(1)?.type).toBe('divider');
      expect(component['selectedBlockId']()).toBe(blocks.at(1)?.id);
      expect(component['insertMenuIndex']()).toBeNull();
      // Neighbors are untouched.
      expect(blocks.at(0)?.id).toBe(before[0]);
      expect(blocks.at(2)?.id).toBe(before[1]);
    });

    it('should delete a block and select the first remaining block if the deleted one was selected', () => {
      const [firstBlock] = component['blocks']();
      if (!firstBlock) throw new Error('Expected the welcome template to seed at least one block');
      const firstId = firstBlock.id;
      component['selectBlock'](firstId);

      component['deleteBlock'](firstId);

      expect(component['blocks']().find((b) => b.id === firstId)).toBeUndefined();
      expect(component['selectedBlockId']()).toBe(component['blocks']()[0]?.id ?? null);
    });

    it('should set selectedBlockId to null when the last block is deleted', () => {
      component['blocks'].set([{ id: 'only', type: 'text', content: 'x' }]);
      component['selectBlock']('only');

      component['deleteBlock']('only');

      expect(component['blocks']()).toEqual([]);
      expect(component['selectedBlockId']()).toBeNull();
    });

    it('should duplicate a block with a new id, inserted right after the original', () => {
      const [original] = component['blocks']();
      if (!original) throw new Error('Expected the welcome template to seed at least one block');

      component['duplicateBlock'](original);

      const blocks = component['blocks']();
      expect(blocks).toHaveLength(getTemplateBlocks('welcome').length + 1);
      expect(blocks[1]?.type).toBe(original.type);
      expect(blocks[1]?.id).not.toBe(original.id);
      expect(component['selectedBlockId']()).toBe(blocks[1]?.id);
    });

    it('should move a block up and down within the list', () => {
      const [first, second] = component['blocks']();
      if (!first || !second) throw new Error('Expected the welcome template to seed at least two blocks');

      component['moveBlockDown'](0);
      expect(component['blocks']()[0]?.id).toBe(second.id);
      expect(component['blocks']()[1]?.id).toBe(first.id);

      component['moveBlockUp'](1);
      expect(component['blocks']()[0]?.id).toBe(first.id);
      expect(component['blocks']()[1]?.id).toBe(second.id);
    });

    it('should not move the first block up or the last block down', () => {
      const before = component['blocks']().map((b) => b.id);

      component['moveBlockUp'](0);
      component['moveBlockDown'](before.length - 1);

      expect(component['blocks']().map((b) => b.id)).toEqual(before);
    });

    it('should select a block and switch the active tab to edit', () => {
      component['activeTab'].set('blocks');
      const thirdBlock = component['blocks']().at(2);
      if (!thirdBlock) throw new Error('Expected the welcome template to seed at least three blocks');
      const targetId = thirdBlock.id;

      component['selectBlock'](targetId);

      expect(component['selectedBlockId']()).toBe(targetId);
      expect(component['activeTab']()).toBe('edit');
      expect(component['selectedBlock']()?.id).toBe(targetId);
    });

    it('should close the insert menu when a block is selected', () => {
      const firstBlock = component['blocks']().at(0);
      if (!firstBlock) throw new Error('Expected the welcome template to seed at least one block');
      component['insertMenuIndex'].set(2);

      component['selectBlock'](firstBlock.id);

      expect(component['insertMenuIndex']()).toBeNull();
    });
  });

  describe('onCanvasDrop', () => {
    beforeEach(async () => {
      await createComponent('');
    });

    /** Hand-built CdkDragDrop stand-in: jsdom has no layout, so real drags cannot be simulated. */
    function fakeDrop(overrides: Record<string, unknown>): CdkDragDrop<EmailBlock[]> {
      return overrides as unknown as CdkDragDrop<EmailBlock[]>;
    }

    it('should reorder blocks when the drop stays within the canvas container', () => {
      const before = component['blocks']().map((b) => b.id);
      const container = { id: 'pc-canvas-drop-list' };

      component['onCanvasDrop'](
        fakeDrop({
          previousContainer: container,
          container,
          previousIndex: 0,
          currentIndex: 2,
          item: { data: component['blocks']().at(0) },
        }),
      );

      const after = component['blocks']().map((b) => b.id);
      expect(after).toHaveLength(before.length);
      expect(after.at(2)).toBe(before.at(0));
      expect(after.at(0)).toBe(before.at(1));
      // The reorder propagated to the compiled output.
      expect(component.htmlContent()).toContain('PPLCRM_VISUAL_BLOCKS_DATA');
    });

    it('should leave the list untouched when dropped back on the same index', () => {
      const before = component['blocks']().map((b) => b.id);
      const container = { id: 'pc-canvas-drop-list' };

      component['onCanvasDrop'](
        fakeDrop({
          previousContainer: container,
          container,
          previousIndex: 1,
          currentIndex: 1,
          item: { data: component['blocks']().at(1) },
        }),
      );

      expect(component['blocks']().map((b) => b.id)).toEqual(before);
    });

    it('should copy-insert a new block when a palette type is dropped from another container', () => {
      const before = component['blocks']().length;

      component['onCanvasDrop'](
        fakeDrop({
          previousContainer: { id: 'palette' },
          container: { id: 'pc-canvas-drop-list' },
          previousIndex: 0,
          currentIndex: 1,
          item: { data: 'button' },
        }),
      );

      const blocks = component['blocks']();
      expect(blocks).toHaveLength(before + 1);
      expect(blocks.at(1)?.type).toBe('button');
      expect(component['selectedBlockId']()).toBe(blocks.at(1)?.id);
    });

    it('should ignore cross-container drops whose drag data is not a block type', () => {
      const before = component['blocks']().map((b) => b.id);

      component['onCanvasDrop'](
        fakeDrop({
          previousContainer: { id: 'palette' },
          container: { id: 'pc-canvas-drop-list' },
          previousIndex: 0,
          currentIndex: 1,
          item: { data: { unexpected: true } },
        }),
      );

      expect(component['blocks']().map((b) => b.id)).toEqual(before);
    });
  });

  describe('template loading and editor mode', () => {
    beforeEach(async () => {
      await createComponent('');
    });

    it('should propagate compiled html/text when loadTemplate is called with propagation enabled', () => {
      component['loadTemplate']('empty', true);

      expect(component.htmlContent()).toContain('Start Designing Your Newsletter');
      expect(component.plainTextContent()).toContain('Start Designing Your Newsletter');
    });

    it('should toggle from visual to code mode and back, re-propagating on return to visual', () => {
      component['toggleEditorMode']();
      expect(component['editorMode']()).toBe('code');

      component['toggleEditorMode']();
      expect(component['editorMode']()).toBe('visual');
      expect(component.htmlContent().length).toBeGreaterThan(0);
    });

    it('should update model content and derive plain text when raw HTML is edited', () => {
      component['handleRawHtmlEdit']('<p>Hello <b>World</b></p>');

      expect(component.htmlContent()).toBe('<p>Hello <b>World</b></p>');
      expect(component.plainTextContent()).toBe('Hello World');
    });
  });

  describe('variable helpers', () => {
    beforeEach(async () => {
      await createComponent('');
    });

    it('should insert a variable placeholder into the block content field', () => {
      const [block] = component['blocks']();
      if (!block) throw new Error('Expected the welcome template to seed at least one block');
      component['insertVariable'](block, 'FirstName', 'content');

      const updated = component['blocks']().find((b) => b.id === block.id);
      expect(updated?.content ?? '').toContain('{FirstName}');
    });

    it('should resolve a known variable to its mock value in preview text', () => {
      const resolved = component['resolveVariablesForPreview']('Hello {FirstName}!');
      expect(resolved).toContain('John');
    });

    it('should fall back to the provided default when a variable is unknown', () => {
      const resolved = component['resolveVariablesForPreview']('Code: {PromoCode|SAVE10}');
      expect(resolved).toContain('SAVE10');
    });

    it('should escape HTML special characters before substituting variables', () => {
      const resolved = component['resolveVariablesForPreview']('<script>{FirstName}</script>');
      expect(resolved).not.toContain('<script>');
      expect(resolved).toContain('&lt;script&gt;');
    });

    it('should look up mock variable values case-insensitively', () => {
      expect(component['getMockVariableValue']('firstname')).toBe('John');
      expect(component['getMockVariableValue']('unknownvar')).toBeUndefined();
    });
  });
});
