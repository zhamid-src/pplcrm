import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { DetailRow } from './detail-row';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('DetailRow Component', () => {
  let component: DetailRow;
  let fixture: ComponentFixture<DetailRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailRow],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailRow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render icon when provided', () => {
    fixture.componentRef.setInput('icon', 'envelope');
    fixture.componentRef.setInput('iconClass', 'text-indigo-500');
    fixture.detectChanges();
    const iconEl = fixture.debugElement.query(By.css('pc-icon > div'));
    expect(iconEl).toBeTruthy();
    expect(iconEl.nativeElement.classList.contains('text-indigo-500')).toBe(true);
  });

  it('should render action button and emit actionClick when clicked', () => {
    let clicked = false;
    component.actionClick.subscribe(() => {
      clicked = true;
    });

    fixture.componentRef.setInput('actionIcon', 'document-duplicate');
    fixture.componentRef.setInput('actionTip', 'Copy Link');
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('button'));
    expect(buttonEl).toBeTruthy();
    expect(buttonEl.nativeElement.getAttribute('data-tip')).toBe('Copy Link');

    buttonEl.nativeElement.click();
    expect(clicked).toBe(true);
  });
});
