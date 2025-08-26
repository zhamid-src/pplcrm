import type { ActivatedRoute } from '@angular/router';
import type { Router } from '@angular/router';

export function navigateIfValid(router: Router, route: ActivatedRoute, path: string | null | undefined): void {
  if (path) router.navigate([path], { relativeTo: route });
}

export function viewIfAllowed(args: {
  id?: string;
  lastRowHovered?: string;
  disableView: boolean;
  navigate: (path: string | null | undefined) => void;
}) {
  if (args.id) return args.navigate(args.id);
  if (!args.disableView) args.navigate(args.lastRowHovered);
}
