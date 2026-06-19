import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
// @ts-ignore
const purify = DOMPurify(window);

/**
 * Sanitizes HTML string on the backend to mitigate XSS risks.
 * Uses DOMPurify with default safe settings to clean raw email layouts.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return purify.sanitize(html);
}
