/**
 * @file Unit tests for {@link HouseholdsGrid} component.
 */
jest.mock('@uxcommon/components/datagrid/datagrid', () => {
  return {
    DataGrid: class {
      protected tagArrayEquals() {
        return 0;
      }
      protected tagsToString(tags: string[]) {
        return tags?.toString() ?? '';
      }
      protected openEditOnDoubleClick() {
        return undefined;
      }
    },
  };
});

// TagsCellRenderer removed

import { HouseholdsGrid } from './households-grid';

describe('HouseholdsGrid', () => {
  let component: HouseholdsGrid;

  beforeEach(() => {
    component = new HouseholdsGrid();
  });

  it('should define persons_count column', () => {
    const hasPersonsCount = component['col'].some((c) => c.field === 'persons_count');
    expect(hasPersonsCount).toBe(true);
  });
});
