import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormActions } from './form-actions';
import type { SignalFormRoot } from './form-actions';

/** Signal-backed fake of a signal-forms root — the structural contract
 * FormActions consumes (`sigF().invalid()/dirty()/reset()`). */
function fakeSignalForm(initial: { dirty: boolean; invalid: boolean }) {
  const dirty = signal(initial.dirty);
  const invalid = signal(initial.invalid);
  const reset = vi.fn();
  const root: SignalFormRoot = () => ({
    dirty: () => dirty(),
    invalid: () => invalid(),
    reset,
  });
  return { root, dirty, invalid, reset };
}

describe('FormActions', () => {
  let fixture: ComponentFixture<FormActions>;
  let component: FormActions;
  const navigate = vi.fn().mockResolvedValue(true);

  const saveButton = (): HTMLButtonElement =>
    fixture.debugElement.query(By.css('button.btn-primary')).nativeElement as HTMLButtonElement;

  beforeEach(async () => {
    navigate.mockClear();
    await TestBed.configureTestingModule({
      imports: [FormActions],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormActions);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isLoading', false);
  });

  it('keeps Save enabled when no signalForm is provided (plain button bar, e.g. list-view)', () => {
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);
  });

  it('disables Save while the form is pristine or invalid, and enables it once dirty and valid', () => {
    const form = fakeSignalForm({ dirty: false, invalid: true });
    fixture.componentRef.setInput('signalForm', form.root);
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(true);

    form.dirty.set(true); // dirty but still invalid
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(true);

    form.invalid.set(false); // dirty and valid
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);

    form.dirty.set(false); // valid but pristine again
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(true);
  });

  it('disables Save while loading even when the form is dirty and valid', () => {
    const form = fakeSignalForm({ dirty: true, invalid: false });
    fixture.componentRef.setInput('signalForm', form.root);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(true);
  });

  it('disables Save when the disabled input is set, regardless of form state', () => {
    const form = fakeSignalForm({ dirty: true, invalid: false });
    fixture.componentRef.setInput('signalForm', form.root);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(true);
  });

  it('keeps Save enabled on an invalid/pristine form when saveAlwaysEnabled is set, but still gates on loading', () => {
    const form = fakeSignalForm({ dirty: false, invalid: true });
    fixture.componentRef.setInput('signalForm', form.root);
    fixture.componentRef.setInput('saveAlwaysEnabled', true);
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(false);

    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect(saveButton().disabled).toBe(true);
  });

  it('emits btn1Clicked with a callback that navigates back when Save was clicked', () => {
    const form = fakeSignalForm({ dirty: true, invalid: false });
    fixture.componentRef.setInput('signalForm', form.root);
    const emitted: (() => void)[] = [];
    component.btn1Clicked.subscribe((done) => emitted.push(done));
    fixture.detectChanges();

    saveButton().click();
    expect(emitted).toHaveLength(1);

    emitted[0]();
    expect(navigate).toHaveBeenCalledWith(['../'], { relativeTo: expect.anything() });
    expect(form.reset).not.toHaveBeenCalled();
  });

  it('emits btn1Clicked with a callback that resets (and stays) when "Save & add more" was clicked', () => {
    const form = fakeSignalForm({ dirty: true, invalid: false });
    fixture.componentRef.setInput('signalForm', form.root);
    const emitted: (() => void)[] = [];
    component.btn1Clicked.subscribe((done) => emitted.push(done));
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button.btn-primary'));
    expect(buttons).toHaveLength(2); // buttonsToShow defaults to 'three'
    (buttons[1].nativeElement as HTMLButtonElement).click();
    expect(emitted).toHaveLength(1);

    emitted[0]();
    expect(form.reset).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('emits deleteClicked when the delete button is clicked', () => {
    fixture.componentRef.setInput('showDelete', true);
    const deleteSpy = vi.fn();
    component.deleteClicked.subscribe(deleteSpy);
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('button.btn-error')).nativeElement as HTMLButtonElement;
    deleteButton.click();
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates back when Cancel is clicked', () => {
    fixture.detectChanges();
    const cancelButton = fixture.debugElement.query(By.css('button.btn-accent')).nativeElement as HTMLButtonElement;
    cancelButton.click();
    expect(navigate).toHaveBeenCalledWith(['../'], { relativeTo: expect.anything() });
  });
});
