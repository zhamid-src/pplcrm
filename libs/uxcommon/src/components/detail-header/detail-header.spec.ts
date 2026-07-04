import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetailHeader } from './detail-header';
import { FormActions } from '../form-actions/form-actions';
import { Breadcrumbs } from '../breadcrumbs/breadcrumbs';

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

  it('does not render breadcrumbs when crumbs is empty', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(Breadcrumbs))).toBeNull();
  });

  it('renders breadcrumbs when crumbs has entries and relays prev/next events', () => {
    fixture.componentRef.setInput('crumbs', [{ label: 'People' }, { label: 'Jane Doe' }]);
    fixture.detectChanges();

    const crumbsDe = fixture.debugElement.query(By.directive(Breadcrumbs));
    expect(crumbsDe).not.toBeNull();

    const prevSpy = vi.fn();
    const nextSpy = vi.fn();
    component.prevRecord.subscribe(prevSpy);
    component.nextRecord.subscribe(nextSpy);

    const breadcrumbs = crumbsDe.componentInstance as Breadcrumbs;
    breadcrumbs.prev.emit();
    breadcrumbs.next.emit();

    expect(prevSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledTimes(1);
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

  it('emits save when the nested form-actions emits btn1Clicked', () => {
    fixture.detectChanges();

    const saveSpy = vi.fn();
    component.save.subscribe(saveSpy);

    const saveButton = fixture.debugElement.query(By.css('pc-form-actions button.btn-primary'));
    saveButton.nativeElement.click();

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
