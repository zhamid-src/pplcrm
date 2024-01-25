import { ICellRendererAngularComp } from '@ag-grid-community/angular';
import { GridApi, ICellRendererParams, } from '@ag-grid-community/core';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractBackendService } from '@services/backend/abstract.service';
import { TagsComponent } from '@uxcommon/tags/tags.component';
import { Models } from 'common/src/lib/kysely.models';

interface MyCellRendererParams<T extends keyof Models, U> extends ICellRendererParams {
  service?: AbstractBackendService<T, U>;
}

@Component({
  selector: 'pc-tags-cell-renderer',
  standalone: true,
  imports: [CommonModule, TagsComponent],
  templateUrl: './tagsCellRenderer.component.html',
  styleUrl: './tagsCellRenderer.component.scss',
})
export class TagsCellRendererComponent<T extends keyof Models, U>
  implements ICellRendererAngularComp
{
  private api!: GridApi<T>;
  protected tags: string[] = [];

  private rowId!: string;
  private service?: AbstractBackendService<T, U>;
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
    this.tags = !params.value || !params.value[0] ? [] : params.value;
    return true;
  }

  public removeTag(tag_name: string) {
    this.service?.removeTag(this.rowId, tag_name);
    const node = this.api!.getRowNode(this.rowId);
    this.api?.flashCells({
      rowNodes: node ? [node] : [],
      columns: [this.colName],
    });
  }
}
