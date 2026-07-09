import {
  AddCampaignObj,
  CarryOverCampaignObj,
  SetCampaignSubscriptionObj,
  UpdateCampaignObj,
  UpsertCampaignPersonFactObj,
  idSchema,
} from '../../../../../../libs/common/src';

import { authProcedure, router } from '../../../trpc';
import { CampaignsController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const campaigns = new CampaignsController();

const crud = createCrudRouter(campaigns, AddCampaignObj, UpdateCampaignObj);

export const CampaignsRouter = router({
  ...crud,

  add: authProcedure.input(AddCampaignObj).mutation(({ input, ctx }) => campaigns.addCampaign(input, ctx.auth)),

  /** Lightweight list for the header context switcher. */
  getSwitcherList: authProcedure.query(({ ctx }) => campaigns.getSwitcherList(ctx.auth)),

  /** Switcher payload: all campaigns + this user's active context id. */
  getContext: authProcedure.query(({ ctx }) => campaigns.getContext(ctx.auth)),

  setActiveCampaign: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => campaigns.setActiveCampaign(input, ctx.auth)),

  archive: authProcedure.input(idSchema).mutation(({ input, ctx }) => campaigns.archive(input, ctx.auth)),

  /** Set/clear a person's support level / voting status in one campaign (§15). */
  upsertPersonFact: authProcedure
    .input(UpsertCampaignPersonFactObj)
    .mutation(({ input, ctx }) => campaigns.upsertPersonFact(input, ctx.auth)),

  /** One person's facts across all campaigns (history panel). */
  getPersonFacts: authProcedure.input(idSchema).query(({ input, ctx }) => campaigns.getPersonFacts(input, ctx.auth)),

  /** Staff subscribe/unsubscribe in one campaign (§15). */
  setSubscription: authProcedure
    .input(SetCampaignSubscriptionObj)
    .mutation(({ input, ctx }) => campaigns.setSubscription(input, ctx.auth)),

  /** Consent panel payload: per-campaign rows + global suppressions + DNC. */
  getPersonSubscriptions: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => campaigns.getPersonSubscriptions(input, ctx.auth)),

  unarchive: authProcedure.input(idSchema).mutation(({ input, ctx }) => campaigns.unarchive(input, ctx.auth)),

  /** Seed a campaign from a prior one (§15) — support as assumption, consent only with confirmation. */
  carryOver: authProcedure
    .input(CarryOverCampaignObj)
    .mutation(({ input, ctx }) => campaigns.carryOver(input, ctx.auth)),
});
