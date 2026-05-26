import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { TRPCService } from './trpc-service';
import { ErrorService } from '../error.service';
import { TokenService } from './token-service';
import { Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as idb from 'idb-keyval';

// Mock the indexedDB functions
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn()
}));

// Create a concrete class since TRPCService uses a generic type T
@Injectable()
class TestTRPCService extends TRPCService<'persons'> {
  // Expose protected methods for testing
  public testRunCachedCall(
    apiCall: Promise<any[]>,
    apiName: string,
    options: any,
    refresh: boolean
  ) {
    return this.runCachedCall(apiCall, apiName, options, refresh);
  }

  public testHash(str: string) {
    return this['hash'](str);
  }
}

describe('TRPCService', () => {
  let service: TestTRPCService;
  let mockErrorSvc: any;
  let mockTokenSvc: any;
  let mockRouter: any;

  beforeEach(() => {
    mockErrorSvc = {
      handle: vi.fn()
    };

    mockTokenSvc = {
      getAuthToken: vi.fn().mockReturnValue('test-token')
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        TestTRPCService,
        { provide: ErrorService, useValue: mockErrorSvc },
        { provide: TokenService, useValue: mockTokenSvc },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(TestTRPCService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service['api']).toBeDefined();
  });

  describe('abort()', () => {
    it('should call abort on the current AbortController and create a new one', () => {
      const initialAc = service['ac'];
      const abortSpy = vi.spyOn(initialAc, 'abort');
      
      service.abort();
      
      expect(abortSpy).toHaveBeenCalled();
      expect(service['ac']).not.toBe(initialAc);
    });
  });

  describe('hash()', () => {
    it('should generate consistent hashes for the same string', () => {
      const str = 'test string';
      const hash1 = service.testHash(str);
      const hash2 = service.testHash(str);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different strings', () => {
      expect(service.testHash('string1')).not.toBe(service.testHash('string2'));
    });
  });

  describe('runCachedCall()', () => {
    it('should return cached data if valid and refresh is false', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      vi.mocked(idb.get).mockResolvedValueOnce({
        expires: Date.now() + 100000, // future date
        data: mockData
      });

      const apiCall = Promise.resolve([{ id: 2, name: 'New' }]); // Should not be used
      
      const result = await service.testRunCachedCall(apiCall, 'testApi', {}, false);
      
      expect(result).toBe(mockData);
      expect(idb.set).not.toHaveBeenCalled();
    });

    it('should call API and set cache if cache is expired', async () => {
      const cachedData = [{ id: 1, name: 'Old' }];
      vi.mocked(idb.get).mockResolvedValueOnce({
        expires: Date.now() - 100000, // past date
        data: cachedData
      });

      const freshData = [{ id: 2, name: 'Fresh' }];
      const apiCall = Promise.resolve(freshData);
      
      const result = await service.testRunCachedCall(apiCall, 'testApi', {}, false);
      
      expect(result).toBe(freshData);
      expect(idb.set).toHaveBeenCalled();
      const setArgs = vi.mocked(idb.set).mock.calls[0];
      expect(setArgs[1].data).toBe(freshData);
    });

    it('should call API and set cache if refresh is true even if cache is valid', async () => {
      const cachedData = [{ id: 1, name: 'Old' }];
      vi.mocked(idb.get).mockResolvedValueOnce({
        expires: Date.now() + 100000, // future date
        data: cachedData
      });

      const freshData = [{ id: 2, name: 'Fresh' }];
      const apiCall = Promise.resolve(freshData);
      
      const result = await service.testRunCachedCall(apiCall, 'testApi', {}, true); // refresh = true
      
      expect(result).toBe(freshData);
      expect(idb.set).toHaveBeenCalled();
    });

    it('should call API and set cache if cache is empty', async () => {
      vi.mocked(idb.get).mockResolvedValueOnce(null);

      const freshData = [{ id: 2, name: 'Fresh' }];
      const apiCall = Promise.resolve(freshData);
      
      const result = await service.testRunCachedCall(apiCall, 'testApi', {}, false);
      
      expect(result).toBe(freshData);
      expect(idb.set).toHaveBeenCalled();
    });
  });
});
