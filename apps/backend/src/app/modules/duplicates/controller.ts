import type { IAuthKeyPayload } from '../../../../../../libs/common/src';
import { DuplicatesRepo } from './repositories/duplicates.repo';

export interface DuplicatesSweepInfo {
  lastSweepAt: string | null;
  queueCount: number;
}

export class DuplicatesController {
  private readonly repo = new DuplicatesRepo();

  /** Sidebar Duplicates badge (spec §9.3 TODO `duplicates.countQueue`) and the admin sentence's
   * lead number both want this same total. */
  public countQueue(auth: IAuthKeyPayload): Promise<number> {
    return this.repo.countQueue(auth.tenant_id);
  }

  /** The "found by the nightly sweep — ... last sweep 3:04 AM" sentence and the empty-state
   * copy both need the sweep timestamp; bundled with the count so the page fetches once. */
  public async getSweepInfo(auth: IAuthKeyPayload): Promise<DuplicatesSweepInfo> {
    const [lastSweepAt, queueCount] = await Promise.all([this.repo.getLastSweepAt(), this.countQueue(auth)]);
    return { lastSweepAt: lastSweepAt ? lastSweepAt.toISOString() : null, queueCount };
  }

  public async dismissGroup(groupKey: string, auth: IAuthKeyPayload): Promise<void> {
    await this.repo.dismissGroup({ tenant_id: auth.tenant_id, group_key: groupKey, user_id: auth.user_id });
  }
}
