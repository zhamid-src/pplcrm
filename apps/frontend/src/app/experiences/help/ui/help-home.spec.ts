import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { HELP_CATEGORIES } from '@common';
import { HelpHomePage } from './help-home';

describe('HelpHomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpHomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(HelpHomePage);
    fixture.detectChanges();
    return fixture;
  }

  function typeQuery(fixture: ReturnType<typeof render>, value: string) {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders a card for every category with its articles', () => {
    const fixture = render();
    const cards = fixture.nativeElement.querySelectorAll('section.card');
    expect(cards.length).toBe(HELP_CATEGORIES.length);
    expect(fixture.nativeElement.textContent as string).toContain('Getting started');
  });

  it('shows a result count and matching articles while searching', () => {
    const fixture = render();
    typeQuery(fixture, 'newsletter');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/articles? match/);
    expect(text).toContain('Create and send a newsletter');
  });

  it('offers a guided empty state when nothing matches, and clears back to browse', () => {
    const fixture = render();
    typeQuery(fixture, 'zzz-not-a-topic');
    expect(fixture.nativeElement.textContent as string).toContain('No articles match');

    const clear = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('section.card').length).toBe(HELP_CATEGORIES.length);
  });
});
