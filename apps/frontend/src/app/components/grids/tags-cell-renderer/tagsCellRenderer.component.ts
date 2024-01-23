import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TagsComponent } from '@uxcommon/tags/tags.component';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'pc-tags-cell-renderer',
  standalone: true,
  imports: [CommonModule, TagsComponent],
  templateUrl: './tagsCellRenderer.component.html',
  styleUrl: './tagsCellRenderer.component.scss',
})
export class TagsCellRendererComponent implements ICellRendererAngularComp {
  public cellValue!: string;
  protected tags: string[] = [];

  // gets called once before the renderer is used
  agInit(params: ICellRendererParams): void {
    this.cellValue = this.getValueToDisplay(params);
  }

  // gets called whenever the user gets the cell to refresh
  refresh(params: ICellRendererParams) {
    this.cellValue = this.getValueToDisplay(params);
    return true;
  }

  getValueToDisplay(params: ICellRendererParams) {
    if (!params.value || !params.value[0]) {
      this.tags = [];
    } else {
      this.tags = params.value;
    }
    return params.value;
  }
}
