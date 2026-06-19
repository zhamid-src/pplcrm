import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { DetailItem } from './detail-item';
import { AlertService } from '../alerts/alert-service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { By } from '@angular/platform-browser';

describe('DetailItem Component', () => {
  let component: DetailItem;
  let fixture: ComponentFixture<DetailItem>;
  let mockAlertSvc: {
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAlertSvc = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DetailItem],
      providers: [{ provide: AlertService, useValue: mockAlertSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailItem);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render label and fallback value if not provided', () => {
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();

    const labelEl = fixture.debugElement.query(By.css('span.uppercase'));
    expect(labelEl.nativeElement.textContent.trim()).toBe('Test Label');

    const valueEl = fixture.debugElement.query(By.css('span.italic'));
    expect(valueEl.nativeElement.textContent.trim()).toBe('Not provided');
  });

  it('should render correct value when provided', () => {
    fixture.componentRef.setInput('label', 'Email Address');
    fixture.componentRef.setInput('value', 'test@example.com');
    fixture.detectChanges();

    const valueEl = fixture.debugElement.query(By.css('.text-sm.font-medium'));
    expect(valueEl.nativeElement.textContent.trim()).toBe('test@example.com');
  });

  it('should render icon when icon is provided', () => {
    fixture.componentRef.setInput('label', 'Phone');
    fixture.componentRef.setInput('value', '555-1234');
    fixture.componentRef.setInput('icon', 'phone');
    fixture.detectChanges();

    const iconEl = fixture.debugElement.query(By.css('pc-icon'));
    expect(iconEl).toBeTruthy();
  });

  it('should copy value to clipboard and show success alert on click', async () => {
    const clipboardMock = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboardMock,
      writable: true,
      configurable: true,
    });

    fixture.componentRef.setInput('label', 'Email');
    fixture.componentRef.setInput('value', 'test@example.com');
    fixture.componentRef.setInput('copyable', true);
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('button'));
    expect(buttonEl).toBeTruthy();

    buttonEl.nativeElement.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(clipboardMock.writeText).toHaveBeenCalledWith('test@example.com');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Email copied to clipboard');
  });
});
