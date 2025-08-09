/**
 * @file Cell renderer that displays tag arrays and allows tag removal.
 */
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { GridApi, ICellRendererParams } from 'ag-grid-community';
import { Component } from '@angular/core';
import { Tags } from '@uxcommon/tags/tags';

import { AbstractAPIService } from '../../../abstract-api.service';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Parameters for the {@link TagsCellRenderer} including a reference to a service.
 */
interface MyCellRendererParams<T extends keyof Models, U> extends ICellRendererParams {
  /** Optional API service used for detaching tags */
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

  /**
   * Initialize the renderer with ag-Grid parameters.
   * @param params Parameters supplied by ag-Grid
   */
  public agInit(params: MyCellRendererParams<T, U>): void {
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    this.api = params.api;

    this.service = params?.service;
    this.rowId = params.data.id;
    this.colName = params.colDef?.field || '';
  }

  /**
   * Refresh tags when grid requests an update.
   * @param params New cell parameters
   * @returns true to inform ag-Grid the refresh succeeded
   */
  public refresh(params: ICellRendererParams) {
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    return true;
  }

  /**
   * Detach a tag via the service and update the grid cell value.
   * @param tag_name Tag string to remove
   */
  public removeTag(tag_name: string) {
    this.service?.detachTag(this.rowId, tag_name);
    this.api?.getRowNode(this.rowId)?.setDataValue(this.colName, this.tags);
  }
}
