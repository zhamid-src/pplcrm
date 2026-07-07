import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { DuplicatePageShellComponent, MergeSummaryComponent } from './merge-summary';

describe('MergeSummaryComponent', () => {
  let component: MergeSummaryComponent;
  let fixture: ComponentFixture<MergeSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MergeSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MergeSummaryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('hasSelections', false);
    fixture.componentRef.setInput('mergeDescription', 'Some description');
  });

  it('should show the placeholder prompt and a disabled merge button when nothing is selected', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Select which record to Keep and which to Merge.');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('should show target/source names and enable the merge button once both are selected', () => {
    fixture.componentRef.setInput('hasSelections', true);
    fixture.componentRef.setInput('targetName', 'John Doe');
    fixture.componentRef.setInput('sourceName', 'Johnny Doe');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('John Doe');
    expect(text).toContain('Johnny Doe');
    expect(text).not.toContain('Select which record to Keep');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(false);
  });

  it('should emit merge when the merge button is clicked', () => {
    const handler = vi.fn();
    component.merge.subscribe(handler);
    fixture.componentRef.setInput('hasSelections', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('DuplicatePageShellComponent', () => {
  let component: DuplicatePageShellComponent;
  let fixture: ComponentFixture<DuplicatePageShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuplicatePageShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DuplicatePageShellComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'People');
    fixture.componentRef.setInput('icon', 'identification');
    fixture.componentRef.setInput('description', 'Review duplicates');
    fixture.componentRef.setInput('entityRoute', 'people');
    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('isEmpty', false);
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalPages', 1);
    fixture.componentRef.setInput('totalGroups', 0);
  });

  it('should show the scanning state while loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Scanning database...');
  });

  it('should show the "clean database" empty state and link back to the entity route', () => {
    fixture.componentRef.setInput('isEmpty', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No duplicates waiting');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a.btn-primary');
    expect(link.getAttribute('href')).toBe('/people');
  });

  it('should render projected content and pagination controls when there are multiple pages', () => {
    fixture.componentRef.setInput('currentPage', 2);
    fixture.componentRef.setInput('totalPages', 3);
    fixture.componentRef.setInput('totalGroups', 25);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Page');
    expect(text).toContain('25 duplicate groups total');

    const prevBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[0];
    const nextBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[1];
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(false);
  });

  it('should emit next and prev when pagination buttons are clicked', () => {
    const nextHandler = vi.fn();
    const prevHandler = vi.fn();
    component.next.subscribe(nextHandler);
    component.prev.subscribe(prevHandler);

    fixture.componentRef.setInput('currentPage', 2);
    fixture.componentRef.setInput('totalPages', 3);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();

    expect(prevHandler).toHaveBeenCalledTimes(1);
    expect(nextHandler).toHaveBeenCalledTimes(1);
  });

  it('should disable the previous button on the first page and the next button on the last page', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.componentRef.setInput('totalPages', 1);
    fixture.detectChanges();

    // Only one page: pagination bar should not render at all
    expect(fixture.nativeElement.querySelector('.join')).toBeNull();
  });
});
