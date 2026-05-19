import { TestBed } from '@angular/core/testing';
import { SearchService } from './search-service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.getFilterText()).toBe('');
  });

  it('should set search term immediately with doSearchImmediate', () => {
    service.doSearchImmediate('Test');
    expect(service.getFilterText()).toBe('test');
    expect(service.searchSignal()).toBe('test');
  });

  it('should clear the search term', () => {
    service.doSearchImmediate('Test');
    expect(service.getFilterText()).toBe('test');
    
    service.clearSearch();
    expect(service.getFilterText()).toBe('');
  });

  it('should normalize input with doSearchImmediate', () => {
    service.doSearchImmediate('  HELLO   world  ');
    expect(service.getFilterText()).toBe('hello world');
  });

  it('should update search term after debounce when using doSearch', async () => {
    service.doSearch('debounced term');
    
    // Initially should not be set due to debounce
    expect(service.getFilterText()).toBe('');
    
    // Advance time by debounceTime (300ms)
    await new Promise(r => setTimeout(r, 310));
    
    expect(service.getFilterText()).toBe('debounced term');
  });

  it('should only update if the normalized value is different', async () => {
    let signalCallCount = 0;
    
    // Watch signal for changes (angular signals don't have a direct subscribe, 
    // but we can track by overwriting the signal set function temporarily)
    const originalSet = service.searchSignal.set.bind(service.searchSignal);
    service.searchSignal.set = (val) => {
      signalCallCount++;
      originalSet(val);
    };

    // First search
    service.doSearch('test term');
    await new Promise(r => setTimeout(r, 310));
    expect(signalCallCount).toBe(1);

    // Second search with same normalized value (different whitespace/case)
    service.doSearch('  TEST   Term  ');
    await new Promise(r => setTimeout(r, 310));
    
    // Set should not have been called again because value is identical
    expect(signalCallCount).toBe(1);
    expect(service.getFilterText()).toBe('test term');
  });
});
