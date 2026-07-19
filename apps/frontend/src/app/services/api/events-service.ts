import { Service } from '@angular/core';
import { TRPCService } from './trpc-service';
import type {
  AddTicketTypeType,
  UpdateTicketTypeType,
  AddRegistrationType,
  UpdateRegistrationType,
} from '../../../../../../libs/common/src';

@Service()
export class EventsService extends TRPCService<'events'> {
  public getTicketTypes(eventId: string) {
    return this.api.events.getTicketTypesForEvent.query(eventId);
  }

  public addTicketType(row: AddTicketTypeType) {
    return this.api.events.addTicketType.mutate(row);
  }

  public updateTicketType(id: string, data: UpdateTicketTypeType) {
    return this.api.events.updateTicketType.mutate({ id, data });
  }

  public deleteTicketType(id: string) {
    return this.api.events.deleteTicketType.mutate(id);
  }

  public reorderTicketTypes(eventId: string, orderedIds: string[]) {
    return this.api.events.reorderTicketTypes.mutate({ event_id: eventId, ordered_ids: orderedIds });
  }

  public getRegistrations(eventId: string) {
    return this.api.events.getRegistrationsForEvent.query(eventId);
  }

  public addRegistration(row: AddRegistrationType) {
    return this.api.events.addRegistration.mutate(row);
  }

  public checkIn(id: string) {
    return this.api.events.checkIn.mutate(id);
  }

  public updateRegistration(id: string, data: UpdateRegistrationType) {
    return this.api.events.updateRegistration.mutate({ id, data });
  }

  public deleteRegistration(id: string) {
    return this.api.events.deleteRegistration.mutate(id);
  }

  public getHistoryForPerson(personId: string) {
    return this.api.events.getHistoryForPerson.query(personId);
  }

  public getStatsForPerson(personId: string) {
    return this.api.events.getStatsForPerson.query(personId);
  }
}
