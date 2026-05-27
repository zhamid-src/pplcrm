import { BaseController } from '../../lib/base.controller';
import { VolunteerEventsRepo } from './repositories/volunteer-events.repo';
import type { IAuthKeyPayload } from 'common/src/lib/auth';
import type { OperationDataType } from 'common/src/lib/kysely.models';

export class VolunteerEventsController extends BaseController<'volunteer_events', VolunteerEventsRepo> {
  constructor() {
    super(new VolunteerEventsRepo());
  }

  /**
   * Get all volunteer events with volunteer signup counts.
   */
  public async getAllEvents(auth: IAuthKeyPayload, options?: any) {
    return this.getRepo().getAllEventsWithCount({
      tenant_id: auth.tenant_id,
      options,
    });
  }

  /**
   * Create a new volunteer event.
   */
  public async addEvent(payload: any, auth: IAuthKeyPayload) {
    const row = {
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      name: payload.name,
      description: payload.description ?? null,
      location_address: payload.location_address ?? null,
      start_time: payload.start_time,
      end_time: payload.end_time,
      capacity: payload.capacity ?? null,
    } as OperationDataType<'volunteer_events', 'insert'>;
    return this.add(row);
  }

  /**
   * Update an existing volunteer event.
   */
  public async updateEvent(id: string, payload: any, auth: IAuthKeyPayload) {
    const row = {
      ...payload,
      updatedby_id: auth.user_id,
    } as OperationDataType<'volunteer_events', 'update'>;
    return this.update({
      tenant_id: auth.tenant_id,
      id,
      row,
    });
  }

  /**
   * Get roster shifts for an event.
   */
  public async getShiftsForEvent(event_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getShiftsForEvent({
      tenant_id: auth.tenant_id,
      event_id,
    });
  }

  /**
   * Sign up a person for a volunteer event.
   */
  public async signupVolunteer(payload: any, auth: IAuthKeyPayload) {
    const result = await this.getRepo().signupVolunteer({
      tenant_id: auth.tenant_id,
      event_id: payload.event_id,
      person_id: payload.person_id,
      status: payload.status,
      hours_worked: payload.hours_worked,
      notes: payload.notes,
      user_id: auth.user_id,
    });

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'assign',
        entity: 'volunteer_shifts',
        quantity: 1,
        metadata: { id: result?.id, event_id: payload.event_id, person_id: payload.person_id },
      });
    } catch (e) {
      console.error('Failed to log shift signup activity', e);
    }

    return result;
  }

  /**
   * Update shift status/details.
   */
  public async updateShift(id: string, payload: any, auth: IAuthKeyPayload) {
    const result = await this.getRepo().updateShift({
      tenant_id: auth.tenant_id,
      id,
      row: payload,
      user_id: auth.user_id,
    });

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'update',
        entity: 'volunteer_shifts',
        quantity: 1,
        metadata: { id, status: payload.status },
      });
    } catch (e) {
      console.error('Failed to log shift update activity', e);
    }

    return result;
  }

  /**
   * Delete/cancel a shift.
   */
  public async deleteShift(id: string, auth: IAuthKeyPayload) {
    const result = await this.getRepo().deleteShift({
      tenant_id: auth.tenant_id,
      id,
    });

    try {
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'delete',
        entity: 'volunteer_shifts',
        quantity: 1,
        metadata: { id },
      });
    } catch (e) {
      console.error('Failed to log shift delete activity', e);
    }

    return result;
  }

  /**
   * Get shift history for a person.
   */
  public async getHistoryForPerson(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getHistoryForPerson({
      tenant_id: auth.tenant_id,
      person_id,
    });
  }

  /**
   * Get total volunteer statistics for a person.
   */
  public async getVolunteerStats(person_id: string, auth: IAuthKeyPayload) {
    return this.getRepo().getVolunteerStats({
      tenant_id: auth.tenant_id,
      person_id,
    });
  }
}
