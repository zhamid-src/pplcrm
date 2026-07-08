import { signal } from '@angular/core';
import { TagModel } from './tag-model';

describe('TagModel', () => {
  it('stores the given name', () => {
    const tag = new TagModel('donor');
    expect(tag.name).toBe('donor');
  });

  it('defaults invisible to a signal that reads false', () => {
    const tag = new TagModel('donor');
    expect(tag.invisible()).toBe(false);
  });

  it('accepts and stores a custom invisible signal', () => {
    const customSignal = signal(true);
    const tag = new TagModel('vip', customSignal);
    expect(tag.invisible()).toBe(true);
    expect(tag.invisible).toBe(customSignal);
  });
});
