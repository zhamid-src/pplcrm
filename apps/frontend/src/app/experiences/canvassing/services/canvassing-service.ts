import { Service } from '@angular/core';

import type {
  AddTurfType,
  AssignTurfType,
  CutTurfsType,
  FieldReportRangeType,
  UpdateTurfType,
} from '../../../../../../../libs/common/src';

import { TRPCService } from '../../../services/api/trpc-service';
import type { RouterOutputs } from '../../../services/api/trpc-types';

export type TurfListItem = RouterOutputs['canvassing']['getTurfs'][number];
export type FieldSummary = RouterOutputs['canvassing']['getFieldSummary'];
export type InFieldToday = RouterOutputs['canvassing']['getInFieldToday'];
export type FieldReport = RouterOutputs['canvassing']['getFieldReport'];
export type CutPreview = RouterOutputs['canvassing']['previewCut'];

@Service()
export class CanvassingService extends TRPCService<unknown> {
  public getTurfs(): Promise<TurfListItem[]> {
    return this.api.canvassing.getTurfs.query();
  }

  public getFieldSummary(): Promise<FieldSummary> {
    return this.api.canvassing.getFieldSummary.query();
  }

  public getInFieldToday(): Promise<InFieldToday> {
    return this.api.canvassing.getInFieldToday.query();
  }

  public getFieldReport(input: FieldReportRangeType): Promise<FieldReport> {
    return this.api.canvassing.getFieldReport.query(input);
  }

  public exportFieldReport(input: FieldReportRangeType): Promise<{ filename: string; content: string }> {
    return this.api.canvassing.exportFieldReport.query(input);
  }

  public previewCut(input: CutTurfsType): Promise<CutPreview> {
    return this.api.canvassing.previewCut.query(input);
  }

  public cutTurfs(input: CutTurfsType): Promise<{ created: number; unplaced: number }> {
    return this.api.canvassing.cutTurfs.mutate(input);
  }

  public assign(input: AssignTurfType): Promise<{ token: string }> {
    return this.api.canvassing.assign.mutate(input);
  }

  public getCompanionLink(turfId: string): Promise<{ token: string }> {
    return this.api.canvassing.getCompanionLink.mutate(turfId);
  }

  public retire(turfId: string): Promise<void> {
    return this.api.canvassing.retire.mutate(turfId).then(() => undefined);
  }

  public refreshFromList(turfId: string): Promise<{ added: number; removed: number }> {
    return this.api.canvassing.refreshFromList.mutate(turfId);
  }

  public addTurf(input: AddTurfType): Promise<{ id: string }> {
    return this.api.canvassing.addTurf.mutate(input);
  }

  public updateTurf(id: string, data: UpdateTurfType): Promise<void> {
    return this.api.canvassing.updateTurf.mutate({ id, data }).then(() => undefined);
  }
}
