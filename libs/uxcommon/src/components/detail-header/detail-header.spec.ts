import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DetailHeader } from './detail-header';
import { FormActions } from '../form-actions/form-actions';
import { BreadcrumbsService } from '../breadcrumbs/breadcrumbs.service';

describe('DetailHeader', () => {
  let fixture: ComponentFixture<DetailHeader>;
  let component: DetailHeader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailHeader],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Jane Doe');
    fixture.componentRef.setInput('isLoading', false);
  });

  it('renders the title, eyebrow, subtitle, and icon when provided', () => {
    fixture.componentRef.setInput('eyebrow', 'Person');
    fixture.componentRef.setInput('subtitle', 'jane@example.com');
    fixture.componentRef.setInput('icon', 'user');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('h1')).nativeElement.textContent.trim()).toBe('Jane Doe');
    expect(fixture.debugElement.query(By.css('p')).nativeElement.textContent.trim()).toBe('Person');
    const paragraphs = fixture.debugElement.queryAll(By.css('p'));
    expect(paragraphs[1].nativeElement.textContent.trim()).toBe('jane@example.com');
    expect(fixture.debugElement.query(By.css('pc-icon'))).not.toBeNull();
  });

  it('does not render breadcrumbs inline (they are hoisted to the navbar)', () => {
    fixture.componentRef.setInput('crumbs', [{ label: 'People' }, { label: 'Jane Doe' }]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('pc-breadcrumbs'))).toBeNull();
  });

  it('publishes the crumb trail to BreadcrumbsService and relays pager prev/next', () => {
    const breadcrumbs = TestBed.inject(BreadcrumbsService);
    fixture.componentRef.setInput('crumbs', [{ label: 'People' }, { label: 'Jane Doe' }]);
    fixture.detectChanges();

    const trail = breadcrumbs.trail();
    expect(trail).not.toBeNull();
    expect(trail?.crumbs).toEqual([{ label: 'People' }, { label: 'Jane Doe' }]);

    const prevSpy = vi.fn();
    const nextSpy = vi.fn();
    component.prevRecord.subscribe(prevSpy);
    component.nextRecord.subscribe(nextSpy);

    trail?.onPrev();
    trail?.onNext();

    expect(prevSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the published trail when the header is destroyed', () => {
    const breadcrumbs = TestBed.inject(BreadcrumbsService);
    fixture.componentRef.setInput('crumbs', [{ label: 'People' }]);
    fixture.detectChanges();
    expect(breadcrumbs.trail()).not.toBeNull();

    fixture.destroy();
    expect(breadcrumbs.trail()).toBeNull();
  });

  it('shows pc-form-actions when showActions is true (default) and hides it when false', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(FormActions))).not.toBeNull();

    fixture.componentRef.setInput('showActions', false);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(FormActions))).toBeNull();
  });

  it('passes buttonsToShow through to form-actions when showDelete is false', () => {
    fixture.componentRef.setInput('showDelete', false);
    fixture.componentRef.setInput('buttonsToShow', 'two');
    fixture.detectChanges();

    const formActions = fixture.debugElement.query(By.directive(FormActions)).componentInstance as FormActions;
    expect(formActions.buttonsToShow()).toBe('two');

    fixture.componentRef.setInput('buttonsToShow', 'three');
    fixture.detectChanges();
    expect(formActions.buttonsToShow()).toBe('three');
  });

  it('forces buttonsToShow to two whenever showDelete is true, regardless of the buttonsToShow input', () => {
    fixture.componentRef.setInput('showDelete', true);
    fixture.componentRef.setInput('buttonsToShow', 'three');
    fixture.detectChanges();

    const formActions = fixture.debugElement.query(By.directive(FormActions)).componentInstance as FormActions;
    expect(formActions.buttonsToShow()).toBe('two');
  });

  it('does not render the delete control when showDelete is false', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.dropdown'))).toBeNull();
  });

  it('renders the delete control when showDelete is true and emits delete on click', () => {
    fixture.componentRef.setInput('showDelete', true);
    fixture.componentRef.setInput('deleteText', 'Remove person');
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('.dropdown button.text-error'));
    expect(deleteButton).not.toBeNull();
    expect(deleteButton.nativeElement.textContent.trim()).toContain('Remove person');

    const deleteSpy = vi.fn();
    component.delete.subscribe(deleteSpy);
    deleteButton.nativeElement.click();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  describe('mobile (below sm)', () => {
    const originalMatchMedia = window.matchMedia;

    function createMobileFixture(): ComponentFixture<DetailHeader> {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockReturnValue({
          matches: true,
          media: '(max-width: 639.98px)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      });
      const mobileFixture = TestBed.createComponent(DetailHeader);
      mobileFixture.componentRef.setInput('title', 'Jane Doe');
      mobileFixture.componentRef.setInput('isLoading', false);
      return mobileFixture;
    }

    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
    });

    it('keeps Save/Cancel inline and out of the overflow menu (§2: never hide the critical path)', () => {
      const mobileFixture = createMobileFixture();
      mobileFixture.detectChanges();

      // Exactly one form-actions instance, rendered inline — NOT inside the dropdown.
      expect(mobileFixture.debugElement.queryAll(By.directive(FormActions)).length).toBe(1);
      expect(mobileFixture.debugElement.query(By.css('.dropdown-content pc-form-actions'))).toBeNull();
      const inline = mobileFixture.debugElement.query(By.css('pc-form-actions'));
      expect(inline).not.toBeNull();
    });

    it('labels the overflow trigger and keeps the delete item in the menu when showDelete is true', () => {
      const mobileFixture = createMobileFixture();
      mobileFixture.componentRef.setInput('showDelete', true);
      mobileFixture.detectChanges();

      // Labeled "Actions" trigger on phones (a bare ⋮ does not read as a menu).
      const trigger = mobileFixture.debugElement.query(By.css('.dropdown > button'));
      expect(trigger.nativeElement.textContent).toContain('Actions');
      expect(mobileFixture.debugElement.query(By.css('.dropdown-content button.text-error'))).not.toBeNull();
    });
  });

  it('emits save when the nested form-actions emits btn1Clicked', () => {
    fixture.detectChanges();

    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    const saveButton = fixture.debugElement.query(By.css('pc-form-actions button.btn-primary'));
    saveButton.nativeElement.click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
