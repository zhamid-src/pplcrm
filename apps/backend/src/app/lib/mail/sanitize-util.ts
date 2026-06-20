import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
// @ts-ignore
const purify = DOMPurify(window);

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return purify.sanitize(html);
}
