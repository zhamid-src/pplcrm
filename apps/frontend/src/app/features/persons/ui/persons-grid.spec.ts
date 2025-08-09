/**
 * @file Unit tests for {@link PersonsGrid} component.
 */
jest.mock('@angular/core', () => {
  const actual = jest.requireActual('@angular/core');
  return {
    ...actual,
    inject: () => ({ snapshot: { data: {} } }),
  };
});

jest.mock('@uxcommon/datagrid/datagrid', () => {
  return {
    DataGrid: class {
      protected router = { navigate: jest.fn() };
      protected tagArrayEquals() {
        return 0;
      }
      protected tagsToString(tags: string[]) {
        return tags?.toString() ?? '';
      }
      protected openEditOnDoubleClick() {}
    },
  };
});

jest.mock('../../tags/ui/tags-cell-renderer', () => ({ TagsCellRenderer: class {} }), { virtual: true });
jest.mock('@uxcommon/icon', () => ({ Icon: class {} }), { virtual: true });
jest.mock('./persons-grid.html', () => '', { virtual: true });

import { PersonsGrid } from './persons-grid';

describe('PersonsGrid', () => {
  let component: PersonsGrid;
  let router: any;

  beforeEach(() => {
    component = new PersonsGrid();
    router = (component as any).router;
  });

  it('should set household id and confirm on double click', () => {
    const spy = jest.spyOn(component as any, 'confirmAddressChange').mockImplementation(() => {});
    (component as any).confirmOpenEditOnDoubleClick({ data: { household_id: 'h1' } } as any);
    expect((component as any).addressChangeModalId).toBe('h1');
    expect(spy).toHaveBeenCalled();
  });

  it('should navigate to households on routeToHouseholds', () => {
    (component as any).addressChangeModalId = 'h2';
    const close = jest.fn();
    document.querySelector = jest.fn().mockReturnValue({ close });
    (component as any).routeToHouseholds();
    expect(close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['console', 'households', 'h2']);
  });
});

