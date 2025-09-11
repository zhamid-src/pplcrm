import { Injectable } from '@angular/core';
import type { ActivatedRoute, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class DataGridNavService {
  navigateIfValid(router: Router, route: ActivatedRoute, path: string | null | undefined): void {
    if (path) router.navigate([path], { relativeTo: route });
  }

  viewIfAllowed(args: {
    id?: string;
    lastRowHovered?: string;
    disableView: boolean;
    navigate: (path: string | null | undefined) => void;
  }) {
    if (args.id) return args.navigate(args.id);
    if (!args.disableView) args.navigate(args.lastRowHovered);
  }
}

