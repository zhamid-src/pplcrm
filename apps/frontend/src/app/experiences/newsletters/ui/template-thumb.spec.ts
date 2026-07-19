import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { TemplateThumbComponent } from './template-thumb';

describe('TemplateThumbComponent', () => {
  let fixture: ComponentFixture<TemplateThumbComponent>;

  const html = '<!DOCTYPE html><html><body><p>Preview body</p></body></html>';

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TemplateThumbComponent] }).compileComponents();
    fixture = TestBed.createComponent(TemplateThumbComponent);
    fixture.componentRef.setInput('html', html);
    fixture.detectChanges();
  });

  it('renders a fully sandboxed, focus-proof, decorative iframe', () => {
    const iframe: HTMLIFrameElement | null = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    // sandbox="" = every restriction on; this is what makes the sanitizer bypass safe.
    expect(iframe?.getAttribute('sandbox')).toBe('');
    expect(iframe?.getAttribute('tabindex')).toBe('-1');
    expect(iframe?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('applies the bypassed html to srcdoc unchanged', () => {
    const iframe: HTMLIFrameElement | null = fixture.nativeElement.querySelector('iframe');
    // The bypass must deliver the compiled document verbatim (doctype included).
    expect(iframe?.srcdoc).toBe(html);
  });
});
