import { navigateIfValid, viewIfAllowed } from '../datagrid.nav';

describe('datagrid.nav', () => {
  test('navigateIfValid navigates when path truthy', () => {
    const router = { navigate: jest.fn() } as any;
    const route = {} as any;
    navigateIfValid(router, route, '/foo');
    expect(router.navigate).toHaveBeenCalledWith(['/foo'], { relativeTo: route });
  });

  test('navigateIfValid no-op on falsy path', () => {
    const router = { navigate: jest.fn() } as any;
    const route = {} as any;
    navigateIfValid(router, route, null);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  test('viewIfAllowed uses explicit id', () => {
    const nav = jest.fn();
    viewIfAllowed({ id: '123', lastRowHovered: '9', disableView: true, navigate: nav });
    expect(nav).toHaveBeenCalledWith('123');
  });

  test('viewIfAllowed falls back to lastRowHovered if allowed', () => {
    const nav = jest.fn();
    viewIfAllowed({ lastRowHovered: '9', disableView: false, navigate: nav });
    expect(nav).toHaveBeenCalledWith('9');
  });

  test('viewIfAllowed no-op when disabled and no id', () => {
    const nav = jest.fn();
    viewIfAllowed({ disableView: true, navigate: nav });
    expect(nav).not.toHaveBeenCalled();
  });
});
