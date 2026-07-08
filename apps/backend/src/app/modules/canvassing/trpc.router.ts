import { z } from 'zod';

import {
  AddTurfObj,
  AssignTurfObj,
  CutTurfsObj,
  FieldReportRangeObj,
  UpdateTurfObj,
  idSchema,
} from '../../../../../../libs/common/src';

import { authProcedure, router } from '../../../trpc';
import { CanvassingController } from './controller';

const controller = new CanvassingController();

export const CanvassingRouter = router({
  // Turfs & assignments page.
  getTurfs: authProcedure.query(({ ctx }) => controller.getTurfs(ctx.auth)),
  getFieldSummary: authProcedure.query(({ ctx }) => controller.getFieldSummary(ctx.auth)),
  getInFieldToday: authProcedure.query(({ ctx }) => controller.getInFieldToday(ctx.auth)),

  // Cut new turfs.
  previewCut: authProcedure.input(CutTurfsObj).query(({ ctx, input }) => controller.previewCut(ctx.auth, input)),
  cutTurfs: authProcedure.input(CutTurfsObj).mutation(({ ctx, input }) => controller.cutTurfs(ctx.auth, input)),
  refreshFromList: authProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => controller.refreshFromList(ctx.auth, input)),

  // Turf CRUD + lifecycle.
  addTurf: authProcedure.input(AddTurfObj).mutation(({ ctx, input }) => controller.addTurf(ctx.auth, input)),
  updateTurf: authProcedure
    .input(z.object({ id: idSchema, data: UpdateTurfObj }))
    .mutation(({ ctx, input }) => controller.updateTurf(ctx.auth, input.id, input.data)),
  assign: authProcedure.input(AssignTurfObj).mutation(({ ctx, input }) => controller.assignTurf(ctx.auth, input)),
  getCompanionLink: authProcedure
    .input(idSchema)
    .mutation(({ ctx, input }) => controller.getCompanionLink(ctx.auth, input)),
  retire: authProcedure.input(idSchema).mutation(({ ctx, input }) => controller.retireTurf(ctx.auth, input)),

  // Field report.
  getFieldReport: authProcedure
    .input(FieldReportRangeObj)
    .query(({ ctx, input }) => controller.getFieldReport(ctx.auth, input)),
  exportFieldReport: authProcedure
    .input(FieldReportRangeObj)
    .query(({ ctx, input }) => controller.exportFieldReportCsv(ctx.auth, input)),
  getCoverage: authProcedure
    .input(FieldReportRangeObj)
    .query(({ ctx, input }) => controller.getCoverage(ctx.auth, input)),
});
