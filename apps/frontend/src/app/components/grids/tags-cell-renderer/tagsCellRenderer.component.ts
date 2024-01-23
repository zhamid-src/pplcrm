import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractBackendService } from '@services/backend/abstract.service';
import { TagsComponent } from '@uxcommon/tags/tags.component';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
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
  public cellValue!: string;

  protected tags: string[] = [];

  private rowId!: string;
  private service?: AbstractBackendService<T, U>;

  constructor() {}

  // gets called once before the renderer is used
  public agInit(params: MyCellRendererParams<T, U>): void {
    this.cellValue = this.getValueToDisplay(params);
    this.service = params?.service;
    this.rowId = params.data.id;
  }

  public getValueToDisplay(params: ICellRendererParams) {
    if (!params.value || !params.value[0]) {
      this.tags = [];
    } else {
      this.tags = params.value;
    }
    return params.value;
  }

  // gets called whenever the user gets the cell to refresh
  public refresh(params: ICellRendererParams) {
    this.cellValue = this.getValueToDisplay(params);
    return true;
  }

  public removeTag(tag_name: string) {
    this.service?.removeTag(this.rowId, tag_name);
  }
}
