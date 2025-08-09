import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { BypassHtmlSanitizerPipe } from './svg-html-pipe';

describe('BypassHtmlSanitizerPipe', () => {
  it('should use DomSanitizer to bypass html', () => {
    const bypass = jest.fn((html: string) => `safe:${html}`);
    TestBed.configureTestingModule({
      providers: [{ provide: DomSanitizer, useValue: { bypassSecurityTrustHtml: bypass } }],
    });

    const pipe = TestBed.runInInjectionContext(() => new BypassHtmlSanitizerPipe());
    const result = pipe.transform('<svg></svg>');

    expect(bypass).toHaveBeenCalledWith('<svg></svg>');
    expect(result).toBe('safe:<svg></svg>');
  });
});
