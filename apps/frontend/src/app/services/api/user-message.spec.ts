import { describe, it, expect } from 'vitest';
import { TRPCClientError } from '@trpc/client';
import { JSendServerError } from '../../../../../../libs/common/src';
import { ApiError } from './api-error';
import { getUserErrorMessage } from './user-message';

const FALLBACK = 'Something went wrong, please try again';

describe('getUserErrorMessage', () => {
  it('shows an ApiError message as-is (backend-sanitized copy)', () => {
    expect(getUserErrorMessage(new ApiError('Could not save the person'), FALLBACK)).toBe('Could not save the person');
  });

  it('falls back when an ApiError has an empty message', () => {
    expect(getUserErrorMessage(new ApiError(''), FALLBACK)).toBe(FALLBACK);
  });

  it('shows a TRPCClientError message as-is', () => {
    expect(getUserErrorMessage(new TRPCClientError('Duplicate name'), FALLBACK)).toBe('Duplicate name');
  });

  it('shows a JSendServerError messageText', () => {
    expect(getUserErrorMessage(new JSendServerError('Upstream unavailable', undefined, 502), FALLBACK)).toBe(
      'Upstream unavailable',
    );
  });

  it('falls back when a JSendServerError has an empty messageText', () => {
    expect(getUserErrorMessage(new JSendServerError('', undefined, 500), FALLBACK)).toBe(FALLBACK);
  });

  it('shows a plain Error message (app-authored copy)', () => {
    expect(getUserErrorMessage(new Error('Pick a campaign first'), FALLBACK)).toBe('Pick a campaign first');
  });

  it('falls back for Error subclasses like TypeError — internals must never leak to the UI', () => {
    expect(getUserErrorMessage(new TypeError("Cannot read properties of undefined (reading 'id')"), FALLBACK)).toBe(
      FALLBACK,
    );
    expect(getUserErrorMessage(new RangeError('Invalid array length'), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for a plain Error with an empty message', () => {
    expect(getUserErrorMessage(new Error(''), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for non-Error values', () => {
    expect(getUserErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(getUserErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(getUserErrorMessage('raw string error', FALLBACK)).toBe(FALLBACK);
    expect(getUserErrorMessage({ message: 'not a real Error' }, FALLBACK)).toBe(FALLBACK);
    expect(getUserErrorMessage(42, FALLBACK)).toBe(FALLBACK);
  });
});
