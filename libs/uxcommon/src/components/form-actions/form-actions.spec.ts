import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormActions } from './form-actions';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  template: `
    <form [formGroup]="form">
      <input formControlName="name" />
      <pc-form-actions [isLoading]="isLoading"></pc-form-actions>
    </form>
  `,
  imports: [ReactiveFormsModule, FormActions],
})
class TestHostComponent {
  form: FormGroup;
  isLoading = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
    });
  }
}

describe('FormActions', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should disable primary buttons when form is pristine/invalid', () => {
    const button = fixture.debugElement.query(By.css('button.btn-primary')).nativeElement as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should enable primary buttons when form becomes dirty and valid', () => {
    const control = hostComponent.form.get('name');
    control?.setValue('Test Name');
    control?.markAsDirty();
    control?.updateValueAndValidity();
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.btn-primary')).nativeElement as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('should disable primary buttons when form is dirty but invalid', () => {
    const control = hostComponent.form.get('name');
    control?.setValue('');
    control?.markAsDirty();
    control?.updateValueAndValidity();
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.btn-primary')).nativeElement as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should disable primary buttons when isLoading is true even if form is valid and dirty', () => {
    const control = hostComponent.form.get('name');
    control?.setValue('Test Name');
    control?.markAsDirty();
    control?.updateValueAndValidity();

    hostComponent.isLoading = true;
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button.btn-primary')).nativeElement as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
