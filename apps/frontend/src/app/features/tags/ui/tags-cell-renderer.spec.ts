import { TagsCellRenderer } from './tags-cell-renderer';

jest.mock('@uxcommon/tags/tags', () => ({ Tags: class {} }), { virtual: true });

describe('TagsCellRenderer', () => {
  it('should remove tag using service and update grid', () => {
    const renderer = new TagsCellRenderer();
    const detachTag = jest.fn();
    const setDataValue = jest.fn();
    const api = { getRowNode: jest.fn().mockReturnValue({ setDataValue }) } as any;
    renderer.agInit({
      value: ['a', 'b'],
      api,
      service: { detachTag } as any,
      data: { id: '1' },
      colDef: { field: 'tags' },
    } as any);
    renderer['tags'] = ['b'];
    renderer.removeTag('a');
    expect(detachTag).toHaveBeenCalledWith('1', 'a');
    expect(setDataValue).toHaveBeenCalledWith('tags', ['b']);
  });

  it('should refresh tags', () => {
    const renderer = new TagsCellRenderer();
    renderer.agInit({ value: ['a'], api: {} as any, data: { id: '1' }, colDef: { field: 'tags' } } as any);
    renderer.refresh({ value: ['c'] } as any);
    expect((renderer as any).tags).toEqual(['c']);
  });
});

