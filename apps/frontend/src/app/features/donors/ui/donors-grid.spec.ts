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
jest.mock('./donors-grid.html', () => '', { virtual: true });

import { DonorsGrid } from './donors-grid';

describe('DonorsGrid', () => {
  let component: DonorsGrid;
  let router: any;

  beforeEach(() => {
    component = new DonorsGrid();
    router = (component as any).router;
  });

  it('should set household id and confirm on double click', () => {
    const spy = jest.spyOn(component as any, 'confirmAddressChange').mockImplementation(() => {});
    component['confirmOpenEditOnDoubleClick']({ data: { household_id: 'h1' } } as any);
    expect(component['addressChangeModalId']).toBe('h1');
    expect(spy).toHaveBeenCalled();
  });

  it('should navigate to households on routeToHouseholds', () => {
    component['addressChangeModalId'] = 'h2';
    const close = jest.fn();
    document.querySelector = jest.fn().mockReturnValue({ close });
    (component as any).routeToHouseholds();
    expect(close).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['console', 'households', 'h2']);
  });
});

