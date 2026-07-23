import type { EmailBlock } from './newsletter-templates';

/** The block type vocabulary of the visual editor (deliberately small). */
export type EmailBlockType = EmailBlock['type'];

export const EMAIL_BLOCK_TYPES = [
  'heading',
  'text',
  'image',
  'button',
  'divider',
  'spacer',
  'social',
] as const satisfies readonly EmailBlockType[];

/** Type guard for untyped drag data arriving from a CDK drop event. */
export function isEmailBlockType(value: unknown): value is EmailBlockType {
  return typeof value === 'string' && (EMAIL_BLOCK_TYPES as readonly string[]).includes(value);
}

/**
 * Returns a new list with the block at `from` moved to `to` (clamped to the
 * list bounds). An out-of-range `from` is a no-op copy. Never mutates `list`.
 */
export function moveBlock(list: readonly EmailBlock[], from: number, to: number): EmailBlock[] {
  const result = [...list];
  if (from < 0 || from >= list.length) return result;
  const clampedTo = Math.max(0, Math.min(to, list.length - 1));
  if (from === clampedTo) return result;
  const [moved] = result.splice(from, 1);
  if (!moved) return [...list];
  result.splice(clampedTo, 0, moved);
  return result;
}

/**
 * Returns a new list with `block` inserted at `index` (clamped to
 * `0..list.length`). Never mutates `list`.
 */
export function insertBlockAt(list: readonly EmailBlock[], block: EmailBlock, index: number): EmailBlock[] {
  const clamped = Math.max(0, Math.min(index, list.length));
  const result = [...list];
  result.splice(clamped, 0, block);
  return result;
}

/** Creates a new block of the given type with the editor's per-type defaults and a fresh id. */
export function createBlock(type: EmailBlockType): EmailBlock {
  const id = Math.random().toString(36).substring(2, 9);
  const styles: NonNullable<EmailBlock['styles']> = {
    textAlign: 'center',
    paddingTop: '16',
    paddingBottom: '16',
  };

  const newBlock: EmailBlock = {
    id,
    type,
    styles,
  };

  // Set block defaults
  if (type === 'heading') {
    newBlock.content = 'Heading Title';
    styles.fontSize = '24px';
    styles.color = '#1f2937';
  } else if (type === 'text') {
    newBlock.content = 'Write your custom message paragraph here. Support multiple paragraphs and inline styling.';
    styles.fontSize = '16px';
    styles.color = '#4b5563';
    styles.textAlign = 'left';
  } else if (type === 'image') {
    newBlock.imageUrl = 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80';
    newBlock.imageAlt = 'Banner image';
    newBlock.imageWidth = '100%';
  } else if (type === 'button') {
    newBlock.content = 'Click Here';
    newBlock.linkUrl = 'https://example.com';
    styles.backgroundColor = '#2563eb';
    styles.color = '#ffffff';
    styles.borderRadius = '6';
    styles.fontSize = '16px';
  } else if (type === 'divider') {
    styles.borderColor = '#e5e7eb';
    styles.borderWidth = '1';
  } else if (type === 'spacer') {
    styles.height = '20';
  } else if (type === 'social') {
    newBlock.socialIconStyle = 'circular-solid';
    newBlock.socials = [
      { platform: 'facebook', url: 'https://facebook.com' },
      { platform: 'twitter', url: 'https://twitter.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
      { platform: 'instagram', url: 'https://instagram.com' },
    ];
  }

  return newBlock;
}

/** Heading sizes for imported h1–h6 (anything past h3 just reads as a small heading). */
const IMPORTED_HEADING_SIZES: Record<string, string> = {
  h1: '28px',
  h2: '24px',
  h3: '20px',
  h4: '18px',
  h5: '16px',
  h6: '16px',
};

/** True when the element holds only text and <br> — i.e. its content survives a plain-text
 * round-trip. Links or inline formatting would be silently dropped, so they disqualify. */
function isPlainInline(el: Element): boolean {
  return Array.from(el.childNodes).every((child) => {
    if (child.nodeType === Node.TEXT_NODE) return true;
    return child instanceof Element && child.tagName.toLowerCase() === 'br' && child.childNodes.length === 0;
  });
}

/** The element's text with <br> preserved as newlines. */
function textWithBreaks(el: Element): string {
  return Array.from(el.childNodes)
    .map((child) => (child.nodeType === Node.TEXT_NODE ? (child.textContent ?? '') : '\n'))
    .join('')
    .trim();
}

/**
 * Best-effort import of legacy/foreign HTML (no embedded block model) into editor blocks, so
 * the visual editor stays the default wherever possible. Deliberately conservative: only
 * top-level headings, plain paragraphs, and <hr> map; anything whose content would not survive
 * the round-trip (links, images, tables, divs, inline formatting) returns null and the editor
 * falls back to raw-HTML mode instead of silently losing content.
 */
export function tryImportHtmlToBlocks(html: string): EmailBlock[] | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: EmailBlock[] = [];

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? '').trim();
      if (text) {
        const block = createBlock('text');
        block.content = text;
        blocks.push(block);
      }
      continue;
    }
    if (!(node instanceof Element)) return null;

    const tag = node.tagName.toLowerCase();
    if (IMPORTED_HEADING_SIZES[tag] && isPlainInline(node)) {
      const block = createBlock('heading');
      block.content = textWithBreaks(node);
      block.styles = { ...block.styles, textAlign: 'left', fontSize: IMPORTED_HEADING_SIZES[tag] };
      blocks.push(block);
    } else if (tag === 'p' && isPlainInline(node)) {
      const block = createBlock('text');
      block.content = textWithBreaks(node);
      blocks.push(block);
    } else if (tag === 'hr') {
      blocks.push(createBlock('divider'));
    } else if (tag === 'br') {
      blocks.push(createBlock('spacer'));
    } else {
      return null;
    }
  }

  return blocks.length > 0 ? blocks : null;
}
