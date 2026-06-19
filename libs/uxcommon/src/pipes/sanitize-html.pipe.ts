// sanitize-html.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import DOMPurify from 'dompurify';

@Pipe({ name: 'sanitizeHtml' })
export class SanitizeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

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
        'tfoot',
        'tr',
        'td',
        'th',
        'colgroup',
        'col',
        'span',
        'div',
        'hr',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'pre',
        'code',
        'sub',
        'sup',
        'b',
        'i',
        'u',
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
        'valign',
        'cellpadding',
        'cellspacing',
        'border',
      ],
      RETURN_TRUSTED_TYPE: false,
    });
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
