import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input Component', () => {
  let component: Input;
  let fixture: ComponentFixture<Input>;
  let testForm: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Input],
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      const payload = signal({ testField: '' });
      testForm = form(payload, () => {
        /* noop */
      });
    });

    fixture = TestBed.createComponent(Input);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('formField', testForm.testField);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render label when input is provided', () => {
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.detectChanges();
    const labelSpan = fixture.debugElement.query(By.css('.label-text'));
    expect(labelSpan.nativeElement.textContent).toContain('Test Label');
  });

  it('should apply placeholder to inner input', () => {
    fixture.componentRef.setInput('placeholder', 'Enter value');
    fixture.detectChanges();
    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl.nativeElement.getAttribute('placeholder')).toBe('Enter value');
  });
});
