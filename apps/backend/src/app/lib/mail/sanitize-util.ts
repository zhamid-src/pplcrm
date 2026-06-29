import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return purify.sanitize(html);
}
