import { ICellRendererAngularComp } from '@ag-grid-community/angular';
import { GridApi, ICellRendererParams } from '@ag-grid-community/core';
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
    [tagNames]="this.tags"
    [readonly]="true"
    (tagRemoved)="removeTag($event)"
  ></pc-tags>`,
})
export class TagsCellRenderer<T extends keyof Models, U> implements ICellRendererAngularComp {
  private _api!: GridApi<T>;
  private _colName!: string;
  private _rowId!: string;
  private _service?: AbstractAPIService<T, U>;

  protected tags: string[] = [];

  // gets called once before the renderer is used
  public agInit(params: MyCellRendererParams<T, U>): void {
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    this._api = params.api;

    this._service = params?.service;
    this._rowId = params.data.id;
    this._colName = params.colDef?.field || '';
  }

  // gets called whenever the user gets the cell to refresh
  public refresh(params: ICellRendererParams) {
    console.log(params);
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    return true;
  }

  public removeTag(tag_name: string) {
    this._service?.detachTag(this._rowId, tag_name);
    this._api?.getRowNode(this._rowId)?.setDataValue(this._colName, this.tags);
  }
}
