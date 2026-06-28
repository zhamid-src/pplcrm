import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea Component', () => {
  let component: Textarea;
  let fixture: ComponentFixture<Textarea>;
  let testForm: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Textarea],
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      const payload = signal({ testField: '' });
      testForm = form(payload, () => {
        /* noop */
      });
    });

    fixture = TestBed.createComponent(Textarea);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('formField', testForm.testField);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render label when textarea is provided', () => {
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.detectChanges();
    const labelSpan = fixture.debugElement.query(By.css('.label-text'));
    expect(labelSpan.nativeElement.textContent).toContain('Test Label');
  });

  it('should apply rows to textarea', () => {
    fixture.componentRef.setInput('rows', 5);
    fixture.detectChanges();
    const textareaEl = fixture.debugElement.query(By.css('textarea'));
    expect(textareaEl.nativeElement.getAttribute('rows')).toBe('5');
  });
});
