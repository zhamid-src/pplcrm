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
