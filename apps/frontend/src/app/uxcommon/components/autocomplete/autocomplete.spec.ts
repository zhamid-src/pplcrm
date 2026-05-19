import { ComponentFixture, TestBed, } from '@angular/core/testing';
import { AutoComplete } from './autocomplete';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('AutoComplete Component', () => {
  let component: AutoComplete;
  let fixture: ComponentFixture<AutoComplete>;
  let mockFilterSvc: any;

  beforeEach(async () => {
    
    mockFilterSvc = {
      filter: vi.fn().mockResolvedValue(['apple', 'banana', 'apricot']),
    };

    await TestBed.configureTestingModule({
      imports: [AutoComplete],
    }).compileComponents();

    fixture = TestBed.createComponent(AutoComplete);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filterSvc', mockFilterSvc);
    fixture.detectChanges();
    afterEach(() => {
    
  });
});

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display placeholder', () => {
    fixture.componentRef.setInput('placeholder', 'Search fruit...');
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.getAttribute('placeholder')).toBe('Search fruit...');
  });

  it('should fetch and show matches on input', async () => {
    const input = fixture.debugElement.query(By.css('input'));
    input.triggerEventHandler('focus', null);
    input.nativeElement.value = 'ap';
    input.triggerEventHandler('input', { target: input.nativeElement });
    
    // debounce is 250ms
    await new Promise(r => setTimeout(r, 250 + 20));
    
    fixture.detectChanges();

    expect(mockFilterSvc.filter).toHaveBeenCalledWith('ap');
    
    // Check if list is rendered
    const listItems = fixture.debugElement.queryAll(By.css('li'));
    expect(listItems.length).toBe(3);
    expect(listItems[0].nativeElement.textContent.trim()).toBe('apple');
  });

  it('should emit value on Enter key and clear input', () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'orange';
    
    input.triggerEventHandler('keyup', { target: input.nativeElement, key: 'Enter' });
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('orange');
    expect(input.nativeElement.value).toBe('');
    expect(component['matches']()).toEqual([]);
  });

  it('should emit value on comma key and clear input', () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    const input = fixture.debugElement.query(By.css('input'));
    input.nativeElement.value = 'grape';
    
    input.triggerEventHandler('keyup', { target: input.nativeElement, key: ',' });
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('grape');
    expect(input.nativeElement.value).toBe('');
  });

  it('should select match from list and emit', async () => {
    const emitSpy = vi.spyOn(component.valueChange, 'emit');
    const input = fixture.debugElement.query(By.css('input'));
    input.triggerEventHandler('focus', null);
    input.nativeElement.value = 'ap';
    input.triggerEventHandler('input', { target: input.nativeElement });
    
    await new Promise(r => setTimeout(r, 250 + 20));
    
    fixture.detectChanges();

    const listItems = fixture.debugElement.queryAll(By.css('li'));
    listItems[1].triggerEventHandler('click', null); // banana
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith('banana');
    expect(input.nativeElement.value).toBe('');
    expect(component['matches']()).toEqual([]);
  });

  it('should hide autocomplete list on blur after delay', async () => {
    // Show list first
    component['matches'].set(['test']);
    component['hideAutoComplete'].set(false);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    input.triggerEventHandler('blur', null);
    
    // setTimeout is 200ms
    await new Promise(r => setTimeout(r, 200 + 20));
    fixture.detectChanges();

    expect(component['hideAutoComplete']()).toBe(true);
    const list = fixture.debugElement.query(By.css('ul'));
    expect(list).toBeNull();
  });
});
