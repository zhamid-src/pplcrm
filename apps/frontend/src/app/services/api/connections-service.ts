import { Service } from '@angular/core';
import { TRPCService } from './trpc-service';
import type { AddConnectionType } from '../../../../../../libs/common/src';

@Service()
export class ConnectionsService extends TRPCService<'person_connections'> {
  public getForPerson(personId: string) {
    return this.api.connections.getForPerson.query(personId);
  }

  public countForPerson(personId: string) {
    return this.api.connections.countForPerson.query(personId);
  }

  public add(personId: string, data: AddConnectionType) {
    return this.api.connections.add.mutate({ person_id: personId, data });
  }

  public remove(id: string) {
    return this.api.connections.remove.mutate(id);
  }
}
