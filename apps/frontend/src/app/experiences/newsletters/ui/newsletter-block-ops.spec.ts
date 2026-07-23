import { describe, it, expect } from 'vitest';
import {
  createBlock,
  insertBlockAt,
  isEmailBlockType,
  moveBlock,
  tryImportHtmlToBlocks,
  EMAIL_BLOCK_TYPES,
} from './newsletter-block-ops';
import type { EmailBlock } from './newsletter-templates';

function makeList(...ids: string[]): EmailBlock[] {
  return ids.map((id) => ({ id, type: 'text', content: id }));
}

describe('moveBlock', () => {
  it('should move a block forward within the list', () => {
    const list = makeList('a', 'b', 'c');
    const result = moveBlock(list, 0, 2);
    expect(result.map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('should move a block backward within the list', () => {
    const list = makeList('a', 'b', 'c');
    const result = moveBlock(list, 2, 0);
    expect(result.map((b) => b.id)).toEqual(['c', 'a', 'b']);
  });

  it('should clamp a destination beyond the end to the last position', () => {
    const list = makeList('a', 'b', 'c');
    const result = moveBlock(list, 0, 99);
    expect(result.map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('should clamp a negative destination to the first position', () => {
    const list = makeList('a', 'b', 'c');
    const result = moveBlock(list, 2, -5);
    expect(result.map((b) => b.id)).toEqual(['c', 'a', 'b']);
  });

  it('should be a no-op copy when the source index is out of range', () => {
    const list = makeList('a', 'b', 'c');
    expect(moveBlock(list, -1, 1).map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(moveBlock(list, 3, 0).map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('should never mutate the input list', () => {
    const list = makeList('a', 'b', 'c');
    const result = moveBlock(list, 0, 2);
    expect(list.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(list);
  });
});

describe('insertBlockAt', () => {
  const block: EmailBlock = { id: 'new', type: 'heading', content: 'New' };

  it('should insert at the start', () => {
    const result = insertBlockAt(makeList('a', 'b'), block, 0);
    expect(result.map((b) => b.id)).toEqual(['new', 'a', 'b']);
  });

  it('should insert in the middle', () => {
    const result = insertBlockAt(makeList('a', 'b'), block, 1);
    expect(result.map((b) => b.id)).toEqual(['a', 'new', 'b']);
  });

  it('should insert at the end', () => {
    const result = insertBlockAt(makeList('a', 'b'), block, 2);
    expect(result.map((b) => b.id)).toEqual(['a', 'b', 'new']);
  });

  it('should clamp out-of-range indices into the list bounds', () => {
    expect(insertBlockAt(makeList('a', 'b'), block, -3).map((b) => b.id)).toEqual(['new', 'a', 'b']);
    expect(insertBlockAt(makeList('a', 'b'), block, 99).map((b) => b.id)).toEqual(['a', 'b', 'new']);
  });

  it('should insert into an empty list', () => {
    expect(insertBlockAt([], block, 0).map((b) => b.id)).toEqual(['new']);
  });

  it('should never mutate the input list', () => {
    const list = makeList('a', 'b');
    const result = insertBlockAt(list, block, 1);
    expect(list.map((b) => b.id)).toEqual(['a', 'b']);
    expect(result).not.toBe(list);
  });
});

describe('createBlock', () => {
  it('should give every block a fresh id and shared padding defaults', () => {
    const a = createBlock('heading');
    const b = createBlock('heading');
    expect(a.id).not.toBe(b.id);
    expect(a.styles?.paddingTop).toBe('16');
    expect(a.styles?.paddingBottom).toBe('16');
  });

  it('should create a heading with title text and heading sizing', () => {
    const block = createBlock('heading');
    expect(block.type).toBe('heading');
    expect(block.content).toBe('Heading Title');
    expect(block.styles?.fontSize).toBe('24px');
    expect(block.styles?.color).toBe('#1f2937');
    expect(block.styles?.textAlign).toBe('center');
  });

  it('should create left-aligned paragraph text', () => {
    const block = createBlock('text');
    expect(block.content).toContain('Write your custom message');
    expect(block.styles?.fontSize).toBe('16px');
    expect(block.styles?.textAlign).toBe('left');
  });

  it('should create an image with url, alt, and full width', () => {
    const block = createBlock('image');
    expect(block.imageUrl).toContain('https://');
    expect(block.imageAlt).toBe('Banner image');
    expect(block.imageWidth).toBe('100%');
  });

  it('should create a button with link and colors', () => {
    const block = createBlock('button');
    expect(block.content).toBe('Click Here');
    expect(block.linkUrl).toBe('https://example.com');
    expect(block.styles?.backgroundColor).toBe('#2563eb');
    expect(block.styles?.color).toBe('#ffffff');
    expect(block.styles?.borderRadius).toBe('6');
  });

  it('should create a divider with border defaults', () => {
    const block = createBlock('divider');
    expect(block.styles?.borderColor).toBe('#e5e7eb');
    expect(block.styles?.borderWidth).toBe('1');
  });

  it('should create a spacer with a default height', () => {
    const block = createBlock('spacer');
    expect(block.styles?.height).toBe('20');
  });

  it('should create a social block with four networks and the solid style', () => {
    const block = createBlock('social');
    expect(block.socialIconStyle).toBe('circular-solid');
    expect(block.socials?.map((s) => s.platform)).toEqual(['facebook', 'twitter', 'linkedin', 'instagram']);
  });
});

describe('isEmailBlockType', () => {
  it('should accept every known block type', () => {
    for (const type of EMAIL_BLOCK_TYPES) {
      expect(isEmailBlockType(type)).toBe(true);
    }
  });

  it('should reject unknown strings and non-strings', () => {
    expect(isEmailBlockType('table')).toBe(false);
    expect(isEmailBlockType(undefined)).toBe(false);
    expect(isEmailBlockType({ type: 'heading' })).toBe(false);
  });
});

describe('tryImportHtmlToBlocks', () => {
  it('should map headings, paragraphs, and hr to blocks', () => {
    const blocks = tryImportHtmlToBlocks('<h1>Title</h1><p>Body text.</p><hr><h3>Small</h3>');
    expect(blocks?.map((b) => b.type)).toEqual(['heading', 'text', 'divider', 'heading']);
    expect(blocks?.[0]?.content).toBe('Title');
    expect(blocks?.[0]?.styles?.fontSize).toBe('28px');
    expect(blocks?.[3]?.styles?.fontSize).toBe('20px');
  });

  it('should preserve <br> inside a paragraph as a newline', () => {
    const blocks = tryImportHtmlToBlocks('<p>Line one<br>Line two</p>');
    expect(blocks?.[0]?.content).toBe('Line one\nLine two');
  });

  it('should wrap stray top-level text in a text block', () => {
    const blocks = tryImportHtmlToBlocks('Just some words');
    expect(blocks?.map((b) => b.type)).toEqual(['text']);
    expect(blocks?.[0]?.content).toBe('Just some words');
  });

  it('should refuse content that would not survive the round-trip', () => {
    expect(tryImportHtmlToBlocks('<p>See <a href="https://x.com">link</a></p>')).toBeNull();
    expect(tryImportHtmlToBlocks('<p>Some <strong>bold</strong> text</p>')).toBeNull();
    expect(tryImportHtmlToBlocks('<table><tr><td>cell</td></tr></table>')).toBeNull();
    expect(tryImportHtmlToBlocks('<div><p>wrapped</p></div>')).toBeNull();
  });

  it('should return null for empty or comment-only input', () => {
    expect(tryImportHtmlToBlocks('')).toBeNull();
    expect(tryImportHtmlToBlocks('<!-- nothing here -->')).toBeNull();
  });
});
