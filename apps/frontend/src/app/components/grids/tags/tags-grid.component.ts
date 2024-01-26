import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddTagType } from '@common';
import { AlertService } from '@services/alert.service';
import { AbstractAPIService } from '@services/backend/abstract.service';
import { TagsService } from '@services/backend/tags.service';
import { SearchService } from '@services/search.service';
import { ThemeService } from '@services/theme.service';
import { DatagridComponent } from '@uxcommon/datagrid/datagrid.component';

@Component({
  selector: 'pc-tags-grid',
  standalone: true,
  imports: [CommonModule, DatagridComponent],
  templateUrl: './tags-grid.component.html',
  styleUrl: './tags-grid.component.scss',
  providers: [{ provide: AbstractAPIService, useClass: TagsService }],
})
export class TagsGridComponent extends DatagridComponent<'tags', AddTagType> {
  protected col = [
    { field: 'name', headerName: 'Tag Name', editable: true },
    { field: 'description', headerName: 'Description', editable: true },
    { field: 'use_count_people', headerName: 'People' },
    { field: 'use_count_households', headerName: 'Households' },
  ];

  constructor(
    router: Router,
    route: ActivatedRoute,
    themeSvc: ThemeService,
    serachSvc: SearchService,
    alertSvc: AlertService,
    gridSvc: TagsService,
    ngZone: NgZone,
  ) {
    super(router, route, themeSvc, serachSvc, alertSvc, gridSvc, ngZone);
  }
}
