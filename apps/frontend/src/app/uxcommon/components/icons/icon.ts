import { Component, WritableSignal, effect, input, signal } from '@angular/core';
import { BypassHtmlSanitizerPipe } from '@uxcommon/pipes/svg-html-pipe';

import { PcIconNameType, loadIconSvg } from './icons.index';

@Component({
  selector: 'pc-icon',
  standalone: true,
  imports: [BypassHtmlSanitizerPipe],
  template: `
    <div [class]="class()" (mouseenter)="hovering.set(true)" (mouseleave)="hovering.set(false)">
      @if (!hover() || !hovering()) {
        <div [innerHTML]="svgHtml() | bypassHtmlSanitizer"></div>
      } @else {
        <div [innerHTML]="hoverSvgHtml() | bypassHtmlSanitizer"></div>
      }
    </div>
  `,
})
export class Icon {
  private _hoverSvgHtml = signal<string>('');

  /** Holds the final SVG markup (with class injected). */
  private _svgHtml = signal<string>('');

  public class = input<string>('');
  public hover = input<PcIconNameType | null>();
  public hoverSvgHtml = this._hoverSvgHtml.asReadonly();
  public hovering = signal(false);

  /** The name of the icon to render (must exist in icons map). */
  public name = input.required<PcIconNameType>();

  /** Tailwind size (used for both height and width), default 6 -> w-6 h-6 */
  public size = input<number>(6);
  public svgHtml = this._svgHtml.asReadonly();

  constructor() {
    // Re-load whenever name or size changes
    effect(() => {
      void this.loadSvg(this.name(), this.size(), this._svgHtml);
    });

    effect(() => {
      const hoverName = this.hover();
      const size = this.size();
      if (!hoverName) {
        this._hoverSvgHtml.set('');
        return;
      }
      void this.loadSvg(hoverName, size, this._hoverSvgHtml);
    });
  }

  /** Add/merge a class on the <svg ...> of the provided SVG string. */
  private injectClassOnSvg(svg: string, cls: string): string {
    // Normalize whitespace on the opening tag
    const openTagMatch = svg.match(/<svg\b[^>]*>/i);
    if (!openTagMatch) return svg; // not an SVG? bail

    const openTag = openTagMatch[0];

    // If class already exists, merge; otherwise add new class attribute
    if (/\bclass=/.test(openTag)) {
      const merged = openTag.replace(/\bclass=(["'])(.*?)\1/i, (_m, q, existing) => `class=${q}${existing} ${cls}${q}`);
      return svg.replace(openTag, merged);
    } else {
      const augmented = openTag.replace(/^<svg\b/i, `<svg class="${cls}"`);
      return svg.replace(openTag, augmented);
    }
  }

  private async loadSvg(name: PcIconNameType, size: number, target: WritableSignal<string>) {
    if (name === 'none') {
      target.set('');
    } else {
      // Fetch raw SVG text from /assets
      const raw = await loadIconSvg(name);
      // Inject Tailwind classes into the <svg> element
      const withClass = this.injectClassOnSvg(raw, `w-${size} h-${size}`);
      target.set(withClass);
    }
  }
}
