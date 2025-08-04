import { ICellRendererAngularComp } from 'ag-grid-angular';
import { GridApi, ICellRendererParams } from 'ag-grid-community';
import { Component } from '@angular/core';
import { Tags } from '@uxcommon/tags/tags';

import { AbstractAPIService } from '../../abstract-api.service';
import { Models } from 'common/src/lib/kysely.models';

interface MyCellRendererParams<T extends keyof Models, U> extends ICellRendererParams {
  service?: AbstractAPIService<T, U>;
}

@Component({
  selector: 'pc-tags-cell-renderer',
  imports: [Tags],
  template: `<pc-tags
    [animateRemoval]="false"
    [tags]="tags"
    [readonly]="true"
    (tagRemoved)="removeTag($event)"
  ></pc-tags>`,
})
export class TagsCellRenderer<T extends keyof Models, U> implements ICellRendererAngularComp {
  private api!: GridApi<T>;
  private colName!: string;
  private rowId!: string;
  private service?: AbstractAPIService<T, U>;

  protected tags: string[] = [];

  // gets called once before the renderer is used
  public agInit(params: MyCellRendererParams<T, U>): void {
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    this.api = params.api;

    this.service = params?.service;
    this.rowId = params.data.id;
    this.colName = params.colDef?.field || '';
  }

  // gets called whenever the user gets the cell to refresh
  public refresh(params: ICellRendererParams) {
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    return true;
  }

  public removeTag(tag_name: string) {
    this.service?.detachTag(this.rowId, tag_name);
    this.api?.getRowNode(this.rowId)?.setDataValue(this.colName, this.tags);
  }
}
