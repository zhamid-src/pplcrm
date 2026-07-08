import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { HelpArticlePage } from './help-article';

describe('HelpArticlePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpArticlePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(id: string) {
    const fixture = TestBed.createComponent(HelpArticlePage);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the article title, category eyebrow, and body', () => {
    const fixture = render('welcome');
    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Welcome to PeopleCRM');
    expect(text).toContain('Getting started');
    expect(text).toContain('min read');
  });

  it('shows an on-page TOC for articles with three or more sections', () => {
    const fixture = render('grid-basics');
    const toc = fixture.nativeElement.querySelector('nav[aria-label="On this page"]');
    expect(toc).not.toBeNull();
  });

  it('renders related reading links', () => {
    const fixture = render('welcome');
    expect(fixture.nativeElement.textContent as string).toContain('Related articles');
  });

  it('guides the reader back when the article does not exist', () => {
    const fixture = render('not-a-real-article');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("This help article doesn't exist");
    expect(text).toContain('Browse all help articles');
  });
});
