import { bucketByRoute, createPayload, getRowId, tagArrayEquals, tagsToString } from '../datagrid.utils';

describe('datagrid.utils', () => {
  test('bucketByRoute groups by route JSON', () => {
    const nodes = [
      { route: ['A'], data: { id: '1' } },
      { route: ['A'], data: { id: '2' } },
      { route: ['B'], data: { id: '3' } },
      { route: ['B'], data: null }, // ignored
    ];
    const map = bucketByRoute(nodes as any[]);
    expect(map.get(JSON.stringify(['A']))).toEqual([{ id: '1' }, { id: '2' }]);
    expect(map.get(JSON.stringify(['B']))).toEqual([{ id: '3' }]);
  });

  test('createPayload returns partial with only the changed key', () => {
    const row = { id: '1', name: 'Alice', age: 30 } as any;
    expect(createPayload(row, 'name' as any)).toEqual({ name: 'Alice' });
    expect(createPayload(row, 'missing' as any)).toEqual({});
  });

  test('getRowId stringifies', () => {
    expect(getRowId({ data: { id: 42 } } as any)).toBe('42');
  });

  test('tagsToString handles empty and non-empty', () => {
    expect(tagsToString([])).toBe('');
    expect(tagsToString(['a', 'b'])).toBe('a,b');
  });

  test('tagArrayEquals compares consistently', () => {
    expect(tagArrayEquals(['a', 'b'], ['a', 'b'])).toBe(0);
    expect(Math.sign(tagArrayEquals(['a'], ['b'])))
      .toBeLessThanOrEqual(0)
      .toBeLessThan(1); // any negative
  });
});
