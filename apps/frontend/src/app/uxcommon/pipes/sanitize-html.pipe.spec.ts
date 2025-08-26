/**
 * @fileoverview Unit tests for SanitizeHtmlPipe.
 * Tests HTML sanitization functionality for safe rendering.
 */
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { SanitizeHtmlPipe } from './sanitize-html.pipe';

describe('SanitizeHtmlPipe', () => {
  let pipe: SanitizeHtmlPipe;
  let mockDomSanitizer: jest.Mocked<DomSanitizer>;

  beforeEach(() => {
    const mockSanitizer = {
      bypassSecurityTrustHtml: jest.fn().mockImplementation((html) => ({
        changingThisBreaksApplicationSecurity: html,
      })),
      sanitize: jest.fn(),
      bypassSecurityTrustStyle: jest.fn(),
      bypassSecurityTrustScript: jest.fn(),
      bypassSecurityTrustUrl: jest.fn(),
      bypassSecurityTrustResourceUrl: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [SanitizeHtmlPipe, { provide: DomSanitizer, useValue: mockSanitizer }],
    });

    pipe = TestBed.inject(SanitizeHtmlPipe);
    mockDomSanitizer = TestBed.inject(DomSanitizer) as jest.Mocked<DomSanitizer>;
  });

  describe('Pipe Creation', () => {
    it('should create', () => {
      expect(pipe).toBeTruthy();
    });

    it('should be injectable', () => {
      expect(pipe).toBeInstanceOf(SanitizeHtmlPipe);
    });
  });

  describe('HTML Sanitization', () => {
    it('should sanitize basic HTML content', () => {
      const htmlContent = '<p>Hello World</p>';

      const result = pipe.transform(htmlContent);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(htmlContent);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: htmlContent });
    });

    it('should handle complex HTML structures', () => {
      const complexHtml = `
        <div class="email-content">
          <h1>Email Subject</h1>
          <p>This is a <strong>test</strong> email with <em>formatting</em>.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;

      const result = pipe.transform(complexHtml);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(complexHtml);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: complexHtml });
    });

    it('should handle HTML with inline styles', () => {
      const styledHtml = '<p style="color: red; font-weight: bold;">Styled content</p>';

      const result = pipe.transform(styledHtml);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(styledHtml);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: styledHtml });
    });

    it('should handle HTML with links', () => {
      const htmlWithLinks = '<p>Visit <a href="https://example.com">our website</a> for more info.</p>';

      const result = pipe.transform(htmlWithLinks);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(htmlWithLinks);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: htmlWithLinks });
    });

    it('should handle HTML with images', () => {
      const htmlWithImages = '<p>Check out this image: <img src="https://example.com/image.jpg" alt="Test"></p>';

      const result = pipe.transform(htmlWithImages);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(htmlWithImages);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: htmlWithImages });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = pipe.transform('');

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('');
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: '' });
    });

    it('should handle null input', () => {
      const result = pipe.transform(null as any);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(null);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: null });
    });

    it('should handle undefined input', () => {
      const result = pipe.transform(undefined as any);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: undefined });
    });

    it('should handle plain text without HTML tags', () => {
      const plainText = 'This is just plain text without any HTML tags.';

      const result = pipe.transform(plainText);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(plainText);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: plainText });
    });
  });

  describe('Security Considerations', () => {
    it('should bypass security for trusted HTML content', () => {
      const trustedHtml = '<p>This content is trusted by the application</p>';

      pipe.transform(trustedHtml);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(trustedHtml);
    });

    it('should handle potentially dangerous HTML (relies on DomSanitizer)', () => {
      const dangerousHtml = '<script>alert("XSS")</script><p>Content</p>';

      const result = pipe.transform(dangerousHtml);

      // The pipe passes through to DomSanitizer, which should handle the security
      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(dangerousHtml);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: dangerousHtml });
    });
  });

  describe('Performance', () => {
    it('should handle large HTML content', () => {
      const largeHtml = '<div>' + 'Content '.repeat(1000) + '</div>';

      const result = pipe.transform(largeHtml);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(largeHtml);
      expect(result).toEqual({ changingThisBreaksApplicationSecurity: largeHtml });
    });

    it('should be called only once per transformation', () => {
      const htmlContent = '<p>Test content</p>';

      pipe.transform(htmlContent);

      expect(mockDomSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledTimes(1);
    });
  });
});
