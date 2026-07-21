import { Service } from '@angular/core';
import { TRPCService } from './trpc-service';

@Service()
export class VolunteerService extends TRPCService<'volunteer_events'> {
  public getAll(options?: any) {
    return this.api.volunteer.getAll.query(options);
  }

  public getById(id: string) {
    return this.api.volunteer.getById.query(id);
  }

  public add(row: any) {
    return this.api.volunteer.add.mutate(row);
  }

  public update(id: string, data: any) {
    return this.api.volunteer.update.mutate({ id, data });
  }

  public delete(id: string) {
    return this.api.volunteer.delete.mutate(id);
  }

  public getShiftsForEvent(eventId: string) {
    return this.api.volunteer.getShiftsForEvent.query(eventId);
  }

  public signupVolunteer(payload: {
    event_id: string;
    person_id: string;
    status?: 'signed_up' | 'attended' | 'no_show' | 'cancelled';
    hours_worked?: number | null;
    notes?: string | null;
  }) {
    return this.api.volunteer.signupVolunteer.mutate(payload);
  }

  public updateShift(
    id: string,
    data: {
      status?: 'signed_up' | 'attended' | 'no_show' | 'cancelled';
      hours_worked?: number | null;
      notes?: string | null;
    },
  ) {
    return this.api.volunteer.updateShift.mutate({ id, data });
  }

  public deleteShift(id: string) {
    return this.api.volunteer.deleteShift.mutate(id);
  }

  public getHistoryForPerson(personId: string) {
    return this.api.volunteer.getHistoryForPerson.query(personId);
  }

  public getVolunteerStats(personId: string) {
    return this.api.volunteer.getVolunteerStats.query(personId);
  }
}
