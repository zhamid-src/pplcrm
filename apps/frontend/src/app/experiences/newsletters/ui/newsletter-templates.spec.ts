import { describe, it, expect } from 'vitest';
import {
  compileBlocksToHtml,
  compileBlocksToPlainText,
  compileTemplateHtml,
  compileTemplatePlainText,
  getSocialBgColor,
  getSocialIconColor,
  getTemplateBlocks,
  type EmailBlock,
} from './newsletter-templates';

describe('newsletter-templates', () => {
  describe('getTemplateBlocks', () => {
    it('should return the welcome template blocks in order', () => {
      const blocks = getTemplateBlocks('welcome');
      expect(blocks.map((b) => b.type)).toEqual(['spacer', 'heading', 'image', 'text', 'button', 'divider', 'social']);
    });

    it('should return the product template blocks', () => {
      const blocks = getTemplateBlocks('product');
      expect(blocks[1]?.content).toBe('Introducing Visual Newsletters!');
    });

    it('should return the newsletter digest template blocks', () => {
      const blocks = getTemplateBlocks('newsletter');
      expect(blocks[0]?.content).toBe('WEEKLY DIGEST');
      expect(blocks.some((b) => b.type === 'social')).toBe(true);
    });

    it('should return a single starter heading block for the empty preset', () => {
      const blocks = getTemplateBlocks('empty');
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.type).toBe('heading');
    });
  });

  describe('getSocialBgColor', () => {
    it('should return brand colors for the circular-solid style', () => {
      expect(getSocialBgColor('facebook', 'circular-solid')).toBe('#1877f2');
      expect(getSocialBgColor('twitter', 'circular-solid')).toBe('#000000');
      expect(getSocialBgColor('linkedin', 'circular-solid')).toBe('#0a66c2');
    });

    it('should return gray for the circular-gray style', () => {
      expect(getSocialBgColor('facebook', 'circular-gray')).toBe('#4b5563');
    });

    it('should return transparent for other styles', () => {
      expect(getSocialBgColor('facebook', 'simple-color')).toBe('transparent');
    });

    it('should default to circular-solid behavior when style is empty', () => {
      expect(getSocialBgColor('instagram', '')).toBe('#e1306c');
    });
  });

  describe('getSocialIconColor', () => {
    it('should return white for circular styles', () => {
      expect(getSocialIconColor('facebook', 'circular-solid')).toBe('#ffffff');
      expect(getSocialIconColor('facebook', 'circular-gray')).toBe('#ffffff');
    });

    it('should return brand colors for simple-color style', () => {
      expect(getSocialIconColor('youtube', 'simple-color')).toBe('#ff0000');
    });

    it('should default to gray for simple-gray style', () => {
      expect(getSocialIconColor('facebook', 'simple-gray')).toBe('#4b5563');
    });
  });

  describe('compileBlocksToHtml', () => {
    it('should render a heading block with its text and alignment', () => {
      const blocks: EmailBlock[] = [
        { id: '1', type: 'heading', content: 'Hello World', styles: { textAlign: 'left' } },
      ];
      const html = compileBlocksToHtml(blocks);
      expect(html).toContain('Hello World');
      expect(html).toContain('text-align: left');
    });

    it('should convert newlines in text blocks to <br />', () => {
      const blocks: EmailBlock[] = [{ id: '1', type: 'text', content: 'Line one\nLine two' }];
      const html = compileBlocksToHtml(blocks);
      expect(html).toContain('Line one<br />Line two');
    });

    it('should wrap an image in a link when linkUrl is set', () => {
      const blocks: EmailBlock[] = [
        { id: '1', type: 'image', imageUrl: 'https://example.com/img.png', linkUrl: 'https://example.com' },
      ];
      const html = compileBlocksToHtml(blocks);
      expect(html).toContain('<a href="https://example.com"');
      expect(html).toContain('src="https://example.com/img.png"');
    });

    it('should render social links with per-platform colors', () => {
      const blocks: EmailBlock[] = [
        {
          id: '1',
          type: 'social',
          socialIconStyle: 'circular-solid',
          socials: [{ platform: 'facebook', url: 'https://facebook.com/x' }],
        },
      ];
      const html = compileBlocksToHtml(blocks);
      expect(html).toContain('https://facebook.com/x');
      expect(html).toContain('#1877f2');
    });

    it('should embed the block list as a recoverable JSON comment', () => {
      const blocks: EmailBlock[] = [{ id: 'abc', type: 'heading', content: 'X' }];
      const html = compileBlocksToHtml(blocks);
      const match = html.match(/<!-- PPLCRM_VISUAL_BLOCKS_DATA: ([\s\S]*?) -->/);
      const encodedPayload = match?.[1];
      if (!encodedPayload) throw new Error('Expected embedded visual blocks metadata comment in compiled HTML');
      const decoded = JSON.parse(decodeURIComponent(encodedPayload.trim()));
      expect(decoded).toEqual(blocks);
    });

    it('should produce a full HTML document shell', () => {
      const html = compileBlocksToHtml([]);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });
  });

  describe('compileBlocksToPlainText', () => {
    it('should render a heading with an underline', () => {
      const text = compileBlocksToPlainText([{ id: '1', type: 'heading', content: 'Title' }]);
      expect(text).toContain('Title');
      expect(text).toContain('====================');
    });

    it('should render a button as text with its link', () => {
      const text = compileBlocksToPlainText([
        { id: '1', type: 'button', content: 'Click Me', linkUrl: 'https://example.com' },
      ]);
      expect(text).toBe('Click Me: https://example.com');
    });

    it('should render social blocks as pipe-separated platform/url pairs', () => {
      const text = compileBlocksToPlainText([
        {
          id: '1',
          type: 'social',
          socials: [
            { platform: 'facebook', url: 'https://fb.com' },
            { platform: 'twitter', url: 'https://tw.com' },
          ],
        },
      ]);
      expect(text).toContain('FACEBOOK: https://fb.com');
      expect(text).toContain('TWITTER: https://tw.com');
    });

    it('should trim leading and trailing whitespace from the result', () => {
      const text = compileBlocksToPlainText([
        { id: '1', type: 'spacer' },
        { id: '2', type: 'text', content: 'Body' },
      ]);
      expect(text.startsWith(' ') || text.startsWith('\n')).toBe(false);
      expect(text.endsWith(' ') || text.endsWith('\n')).toBe(false);
    });
  });

  describe('compileTemplateHtml / compileTemplatePlainText', () => {
    it('should compile the welcome preset consistently through both helpers', () => {
      const html = compileTemplateHtml('welcome');
      const text = compileTemplatePlainText('welcome');
      expect(html).toContain('WELCOME TO OUR COMMUNITY!');
      expect(text).toContain('WELCOME TO OUR COMMUNITY!');
    });
  });
});
