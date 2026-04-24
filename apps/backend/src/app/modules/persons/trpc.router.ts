/**
 * tRPC router offering CRUD operations, tag management, and queries
 * for person records associated with a tenant.
 */
import { UpdatePersonsObj, exportCsvInput, exportCsvResponse, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { PersonsController } from './controller';
import { PersonsService } from './services/persons.service';
import { OperationDataType } from 'common/src/lib/kysely.models';

const persons = new PersonsController();
const personsService = new PersonsService();

function add() {
  return authProcedure.input(UpdatePersonsObj).mutation(({ input, ctx }) => personsService.addPerson(input, ctx.auth));
}

function attachTag() {
  return authProcedure
    .input(z.object({ id: z.string(), tag_name: z.string() }))
    .mutation(({ input, ctx }) => personsService.attachTag(input.id, input.tag_name, ctx.auth));
}

function count() {
  return authProcedure.query(({ ctx }) => persons.getCount(ctx.auth.tenant_id));
}

function deleteMany() {
  return authProcedure
    .input(z.array(z.string()))
    .mutation(({ input, ctx }) => persons.deleteMany(ctx.auth.tenant_id, input));
}

function deleteOne() {
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => persons.delete(ctx.auth.tenant_id, input));
}

function detachTag() {
  return authProcedure.input(z.object({ id: z.string(), tag_name: z.string() })).mutation(({ input, ctx }) =>
    personsService.detachTag({
      tenant_id: ctx.auth.tenant_id,
      person_id: input.id,
      name: input.tag_name,
    }),
  );
}

function getAll() {
  return authProcedure.input(getAllOptions).query(({ input, ctx }) => persons.getAll(ctx.auth.tenant_id, input));
}

function getAllWithAddress() {
  return authProcedure.input(getAllOptions).query(({ input, ctx }) => persons.getAllWithAddress(ctx.auth, input));
}

function getByHouseholdId() {
  return authProcedure
    .input(z.object({ id: z.string(), options: getAllOptions }))
    .query(({ input, ctx }) => persons.getByHouseholdId(input.id, ctx.auth, input.options));
}

function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => persons.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

function getDistinctTags() {
  return authProcedure.query(({ ctx }) => persons.getDistinctTags(ctx.auth));
}

function exportCsv() {
  return authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) =>
      persons.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth),
    );
}

function getTags() {
  return authProcedure.input(z.string()).query(({ input, ctx }) => persons.getTags(input, ctx.auth));
}

function update() {
  return authProcedure.input(z.object({ id: z.string(), data: UpdatePersonsObj })).mutation(({ input, ctx }) =>
    persons.update({
      tenant_id: ctx.auth.tenant_id,
      id: input.id,
      row: input.data as OperationDataType<'persons', 'update'>,
    }),
  );
}

function removeHousehold() {
  return authProcedure.input(z.string()).mutation(({ input, ctx }) => personsService.removeHousehold(input, ctx.auth));
}

function importMany() {
  const ImportRow = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    mobile: z.string().optional(),
    notes: z.string().optional(),
    home_phone: z.string().optional(),
    street_num: z.string().optional(),
    street1: z.string().optional(),
    street2: z.string().optional(),
    apt: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  });

  const Input = z.object({
    rows: z.array(ImportRow),
    tags: z.array(z.string()).optional(),
    skipped: z.number().int().nonnegative().optional(),
    file_name: z.string().trim().min(1).max(255).optional(),
  });

  return authProcedure.input(Input).mutation(({ input, ctx }) => personsService.importRows(input, ctx.auth));
}

export const PersonsRouter = router({
  add: add(),
  count: count(),
  getAll: getAll(),
  update: update(),
  removeHousehold: removeHousehold(),
  import: importMany(),
  getTags: getTags(),
  getById: getById(),
  attachTag: attachTag(),
  detachTag: detachTag(),
  delete: deleteOne(),
  deleteMany: deleteMany(),
  getDistinctTags: getDistinctTags(),
  getByHouseholdId: getByHouseholdId(),
  getAllWithAddress: getAllWithAddress(),
  exportCsv: exportCsv(),
});
