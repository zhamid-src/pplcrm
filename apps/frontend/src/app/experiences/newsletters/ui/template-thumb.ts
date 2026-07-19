import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import type { SafeHtml } from '@angular/platform-browser';

/**
 * A live, scaled-down preview of a compiled newsletter document for the
 * wizard's template cards.
 *
 * The document renders inside an iframe with `sandbox=""` (every restriction
 * on): no scripts, no same-origin access, no forms, no top navigation, no
 * plugins. The iframe is sized to 200% of the card's thumb area and scaled by
 * 0.5 with a top-left origin, so the email lays out at roughly its native
 * 600px width and shrinks to fit. It is decorative only: pointer events are
 * off, it is aria-hidden, and tabindex -1 keeps it out of the tab order so it
 * can never trap focus.
 */
@Component({
  selector: 'pc-template-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full' },
  template: `
    <div class="pointer-events-none h-full w-full select-none overflow-hidden" aria-hidden="true">
      <iframe
        class="origin-top-left scale-50 border-0"
        style="width: 200%; height: 200%"
        sandbox=""
        tabindex="-1"
        title=""
        loading="lazy"
        [srcdoc]="safeHtml()"
      ></iframe>
    </div>
  `,
})
export class TemplateThumbComponent {
  /** The compiled newsletter document, exactly as stored (full <!DOCTYPE html> string). */
  public readonly html = input.required<string>();

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Why bypassSecurityTrustHtml is safe here (and only here): Angular's HTML
   * sanitizer would strip the email's document-level markup (doctype, style,
   * table attributes), and the value is bound exclusively to the `srcdoc` of a
   * fully sandboxed (`sandbox=""`) iframe, where scripts cannot execute and the
   * content has no origin, storage, or access to the parent document. The
   * string never enters the app's own DOM.
   */
  protected readonly safeHtml = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));
}
