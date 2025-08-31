// sanitize-html.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import DOMPurify from 'dompurify';

@Pipe({ name: 'sanitizeHtml', standalone: true })
export class SanitizeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  public transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const clean = DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [
        'a',
        'p',
        'br',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'img',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'span',
        'div',
        'hr',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'src',
        'alt',
        'title',
        'style',
        'class',
        'data-mention',
        'width',
        'height',
        'colspan',
        'rowspan',
        'align',
      ],
      RETURN_TRUSTED_TYPE: false,
    });
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
