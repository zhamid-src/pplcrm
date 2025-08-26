/**
 * Repository for user profile records.
 */
import { Transaction } from 'kysely';

import { BaseRepository, QueryParams } from '../../../lib/base.repo';
import { Models } from 'common/src/lib/kysely.models';

/**
 * Repository for interacting with the `profiles` table.
 */
export class UserProfiles extends BaseRepository<'profiles'> {
  /**
   * Creates a repository instance for the `profiles` table.
   */
  constructor() {
    super('profiles');
  }

  /**
   * Get a single user profile by the given auth ID.
   *
   * @param auth_id - The auth provider's ID for the user.
   * @param options - Optional query parameters to customize the result.
   * @param trx - Optional database transaction context.
   * @returns The matching profile record, or undefined if not found.
   */
  public getOneByAuthId(auth_id: string, options?: QueryParams<'profiles'>, trx?: Transaction<Models>) {
    return this.getSelectWithColumns(options, trx).where('auth_id', '=', auth_id).executeTakeFirst();
  }
}
