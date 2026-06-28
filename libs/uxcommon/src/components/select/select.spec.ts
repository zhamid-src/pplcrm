import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Select } from './select';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';

describe('Select Component', () => {
  let component: Select;
  let fixture: ComponentFixture<Select>;
  let testForm: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Select],
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      const payload = signal({ testField: '' });
      testForm = form(payload, () => {
        /* noop */
      });
    });

    fixture = TestBed.createComponent(Select);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('formField', testForm.testField);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render label when select is provided', () => {
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.detectChanges();
    const labelSpan = fixture.debugElement.query(By.css('.label-text'));
    expect(labelSpan.nativeElement.textContent).toContain('Test Label');
  });

  it('should render placeholder option if provided', () => {
    fixture.componentRef.setInput('placeholder', '-- Select option --');
    fixture.detectChanges();
    const placeholderOption = fixture.debugElement.query(By.css('option'));
    expect(placeholderOption.nativeElement.textContent).toBe('-- Select option --');
    expect(placeholderOption.nativeElement.getAttribute('value')).toBe('');
  });
});
