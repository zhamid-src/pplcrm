import { Service } from '@angular/core';
import {
  AddCampaignType,
  CarryOverCampaignType,
  ExportCsvInputType,
  ExportCsvResponseType,
  SetCampaignSubscriptionType,
  UpdateCampaignType,
  UpsertCampaignPersonFactType,
  getAllOptionsType,
} from '../../../../../../../libs/common/src';

import { AbstractAPIService } from '../../../services/api/abstract-api.service';
import { RouterOutputs } from '../../../services/api/trpc-types';

export type CampaignListItem = RouterOutputs['campaigns']['getSwitcherList'][number];
export type CampaignDetail = RouterOutputs['campaigns']['getById'];
export type PersonCampaignFact = RouterOutputs['campaigns']['getPersonFacts'][number];
export type PersonSubscriptionsPayload = RouterOutputs['campaigns']['getPersonSubscriptions'];

@Service()
export class CampaignsService extends AbstractAPIService<'campaigns', UpdateCampaignType> {
  protected override readonly endpointName = 'campaigns';

  public add(row: AddCampaignType): Promise<CampaignDetail> {
    return this.api.campaigns.add.mutate(row);
  }

  public addMany(_rows: AddCampaignType[]) {
    return Promise.resolve([]);
  }

  public archive(id: string) {
    return this.api.campaigns.archive.mutate(id);
  }

  public carryOver(input: CarryOverCampaignType) {
    return this.api.campaigns.carryOver.mutate(input);
  }

  public attachTag(_id: string, _tag_name: string) {
    return Promise.resolve();
  }

  public count(): Promise<number> {
    return this.getSwitcherList().then((rows) => rows.length);
  }

  public detachTag(_id: string, _tag_name: string) {
    return Promise.resolve(false);
  }

  public getAll(options?: getAllOptionsType): Promise<RouterOutputs['campaigns']['getAll']> {
    return this.api.campaigns.getAll.query(options, { signal: this.ac.signal });
  }

  public getAllArchived(_options?: getAllOptionsType) {
    return Promise.resolve({ rows: [], count: 0 });
  }

  public getById(id: string): Promise<CampaignDetail> {
    return this.api.campaigns.getById.query(id);
  }

  public getSwitcherList(): Promise<RouterOutputs['campaigns']['getSwitcherList']> {
    return this.api.campaigns.getSwitcherList.query(undefined, { signal: this.ac.signal });
  }

  public getPersonFacts(personId: string): Promise<PersonCampaignFact[]> {
    return this.api.campaigns.getPersonFacts.query(personId, { signal: this.ac.signal });
  }

  public getTags(_id: string) {
    return Promise.resolve([]);
  }

  public upsertPersonFact(input: UpsertCampaignPersonFactType) {
    return this.api.campaigns.upsertPersonFact.mutate(input);
  }

  public getPersonSubscriptions(personId: string): Promise<PersonSubscriptionsPayload> {
    return this.api.campaigns.getPersonSubscriptions.query(personId, { signal: this.ac.signal });
  }

  public setSubscription(input: SetCampaignSubscriptionType) {
    return this.api.campaigns.setSubscription.mutate(input);
  }

  public unarchive(id: string) {
    return this.api.campaigns.unarchive.mutate(id);
  }

  public update(id: string, data: UpdateCampaignType): Promise<CampaignDetail> {
    return this.api.campaigns.update.mutate({ id, data });
  }

  public exportCsv(_input: ExportCsvInputType): Promise<ExportCsvResponseType> {
    return Promise.reject(new Error('Campaign export is not available'));
  }
}
