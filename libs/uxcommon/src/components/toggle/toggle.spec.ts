import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toggle } from './toggle';

describe('Toggle Component', () => {
  let component: Toggle;
  let fixture: ComponentFixture<Toggle>;
  let testForm: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toggle],
    }).compileComponents();

    TestBed.runInInjectionContext(() => {
      const payload = signal({ testField: false });
      testForm = form(payload, () => {
        /* noop */
      });
    });

    fixture = TestBed.createComponent(Toggle);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('formField', testForm.testField);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render label when toggle is provided', () => {
    fixture.componentRef.setInput('label', 'Test Toggle Label');
    fixture.detectChanges();
    const labelSpan = fixture.debugElement.query(By.css('.label-text'));
    expect(labelSpan.nativeElement.textContent).toContain('Test Toggle Label');
  });

  it('should render checkbox input element', () => {
    const inputEl = fixture.debugElement.query(By.css('input[type="checkbox"]'));
    expect(inputEl).toBeTruthy();
  });
});
