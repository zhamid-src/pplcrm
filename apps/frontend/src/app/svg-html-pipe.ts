import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * A pipe that bypasses Angular's built-in HTML sanitization and trusts the provided HTML content.
 *
 * **Warning:** Use this pipe only when you are absolutely sure the HTML is safe,
 * as bypassing Angular's sanitization can expose your application to XSS (Cross-Site Scripting) vulnerabilities.
 *
 * This is commonly used when rendering trusted SVG or HTML strings that are known to be safe.
 *
 * @example
 * ```html
 * <div [innerHTML]="svgHtmlString | bypassHtmlSanitizer"></div>
 * ```
 */
@Pipe({ standalone: true, name: 'bypassHtmlSanitizer' })
export class BypassHtmlSanitizerPipe implements PipeTransform {
  private _sanitizer = inject(DomSanitizer);

  /**
   * Transforms a string of HTML into a `SafeHtml` object that Angular will render without sanitization.
   *
   * @param html - The raw HTML string to trust and render.
   * @returns A `SafeHtml` object that Angular considers safe for binding.
   */
  public transform(html: string): SafeHtml {
    return this._sanitizer.bypassSecurityTrustHtml(html);
  }
}
