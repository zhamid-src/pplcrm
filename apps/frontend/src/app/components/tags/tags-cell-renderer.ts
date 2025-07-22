import { ICellRendererAngularComp } from '@ag-grid-community/angular';
import { GridApi, ICellRendererParams } from '@ag-grid-community/core';

import { Component } from '@angular/core';
import { Tags } from 'apps/frontend/src/app/components/tags/tags';
import { Models } from 'common/src/lib/kysely.models';
import { AbstractAPIService } from '../../abstract.service';

interface MyCellRendererParams<T extends keyof Models, U> extends ICellRendererParams {
  service?: AbstractAPIService<T, U>;
}

@Component({
  selector: 'pc-tags-cell-renderer',
  imports: [Tags],
  template: `<pc-tags
    [animateRemoval]="false"
    [tags]="this.tags"
    [readonly]="true"
    (tagRemoved)="removeTag($event)"
    [animate]="false"
  ></pc-tags>`,
})
export class TagsCellRenderer<T extends keyof Models, U> implements ICellRendererAngularComp {
  private api!: GridApi<T>;
  protected tags: string[] = [];

  private rowId!: string;
  private service?: AbstractAPIService<T, U>;
  private colName!: string;

  constructor() {}

  // gets called once before the renderer is used
  public agInit(params: MyCellRendererParams<T, U>): void {
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    this.api = params.api;

    this.service = params?.service;
    this.rowId = params.data.id;
    this.colName = params.colDef!.field!;
  }

  // gets called whenever the user gets the cell to refresh
  public refresh(params: ICellRendererParams) {
    console.log(params);
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    return true;
  }

  public removeTag(tag_name: string) {
    this.service?.detachTag(this.rowId, tag_name);
    this.api!.getRowNode(this.rowId)?.setDataValue(this.colName, this.tags);
  }
}
