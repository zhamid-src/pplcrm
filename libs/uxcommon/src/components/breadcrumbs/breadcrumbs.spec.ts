import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Breadcrumbs } from './breadcrumbs';
import type { PcBreadcrumb } from './breadcrumbs';

describe('Breadcrumbs', () => {
  let component: Breadcrumbs;
  let fixture: ComponentFixture<Breadcrumbs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Breadcrumbs],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Breadcrumbs);
    component = fixture.componentInstance;
  });

  function setCrumbs(crumbs: PcBreadcrumb[]): void {
    fixture.componentRef.setInput('crumbs', crumbs);
    fixture.detectChanges();
  }

  it('renders the last crumb as plain text even when it has a route', () => {
    setCrumbs([
      { label: 'People', route: '/people' },
      { label: 'Jane Doe', route: '/people/1' },
    ]);

    const listItems = fixture.debugElement.queryAll(By.css('li'));
    const lastItem = listItems[listItems.length - 1];
    const link = lastItem.query(By.css('a'));
    const span = lastItem.query(By.css('span[aria-current]'));

    expect(link).toBeNull();
    expect(span.nativeElement.textContent.trim()).toBe('Jane Doe');
    expect(span.attributes['aria-current']).toBe('page');
  });

  it('renders non-last crumbs with a route as routerLink anchors', () => {
    setCrumbs([{ label: 'People', route: '/people' }, { label: 'Jane Doe' }]);

    const anchor = fixture.debugElement.query(By.css('a'));
    expect(anchor).not.toBeNull();
    expect(anchor.nativeElement.textContent.trim()).toBe('People');
    expect(anchor.attributes['href']).toBe('/people');
  });

  it('renders non-last crumbs without a route as plain text, not a link', () => {
    setCrumbs([{ label: 'People' }, { label: 'Jane Doe' }]);

    const anchor = fixture.debugElement.query(By.css('a'));
    const firstSpan = fixture.debugElement.query(By.css('li span'));

    expect(anchor).toBeNull();
    expect(firstSpan.nativeElement.textContent.trim()).toBe('People');
  });

  it('renders the first crumb prominently (page-title style) and later crumbs muted', () => {
    setCrumbs([{ label: 'People', route: '/people' }, { label: 'Jane Doe' }]);

    const anchor = fixture.debugElement.query(By.css('a'));
    expect(anchor.nativeElement.className).toContain('font-semibold');
    expect(anchor.nativeElement.className).toContain('text-sm');

    const lastSpan = fixture.debugElement.query(By.css('span[aria-current]'));
    expect(lastSpan.nativeElement.className).not.toContain('font-semibold');
  });

  it('renders a separator between crumbs but not after the last one', () => {
    setCrumbs([{ label: 'A' }, { label: 'B' }, { label: 'C' }]);

    const listItems = fixture.debugElement.queryAll(By.css('li'));
    expect(listItems.length).toBe(3);

    expect(listItems[0].query(By.css('span[aria-hidden="true"]'))).not.toBeNull();
    expect(listItems[1].query(By.css('span[aria-hidden="true"]'))).not.toBeNull();
    expect(listItems[2].query(By.css('span[aria-hidden="true"]'))).toBeNull();
  });

  it('does not render the position pager when positionLabel is null', () => {
    setCrumbs([{ label: 'A' }]);

    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });

  it('renders the position pager with prev/next buttons bound to hasPrev/hasNext and labels', () => {
    setCrumbs([{ label: 'A' }]);
    fixture.componentRef.setInput('positionLabel', '2 of 5 filtered');
    fixture.componentRef.setInput('hasPrev', false);
    fixture.componentRef.setInput('hasNext', true);
    fixture.componentRef.setInput('prevLabel', 'Previous person');
    fixture.componentRef.setInput('nextLabel', 'Next person');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.length).toBe(2);

    const [prevBtn, nextBtn] = buttons;
    expect(prevBtn.nativeElement.disabled).toBe(true);
    expect(prevBtn.attributes['aria-label']).toBe('Previous person');
    expect(nextBtn.nativeElement.disabled).toBe(false);
    expect(nextBtn.attributes['aria-label']).toBe('Next person');

    const label = fixture.debugElement.query(By.css('nav + div span'));
    expect(label.nativeElement.textContent.trim()).toBe('2 of 5 filtered');
  });

  it('emits prev and next when the pager buttons are clicked', () => {
    setCrumbs([{ label: 'A' }]);
    fixture.componentRef.setInput('positionLabel', '2 of 5 filtered');
    fixture.componentRef.setInput('hasPrev', true);
    fixture.componentRef.setInput('hasNext', true);
    fixture.detectChanges();

    const prevSpy = vi.fn();
    const nextSpy = vi.fn();
    component.prev.subscribe(prevSpy);
    component.next.subscribe(nextSpy);

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();

    expect(prevSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledTimes(1);
  });
});
