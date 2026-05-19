/**
 * tRPC router offering CRUD operations, tag management, and queries
 * for person records associated with a tenant.
 */
import { UpdatePersonsObj, exportCsvInput, exportCsvResponse, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { PersonsController } from './controller';
import { PersonsService } from './services/persons.service';

const persons = new PersonsController();
const personsService = new PersonsService();

const idSchema = z.string().regex(/^\d+$/, 'Invalid ID format');

function add() {
  return authProcedure.input(UpdatePersonsObj).mutation(({ input, ctx }) => personsService.addPerson(input, ctx.auth));
}

function attachTag() {
  return authProcedure
    .input(z.object({ id: idSchema, tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50, 'Tag name too long') }))
    .mutation(({ input, ctx }) => personsService.attachTag(input.id, input.tag_name, ctx.auth));
}

function count() {
  return authProcedure.query(({ ctx }) => persons.getCount(ctx.auth.tenant_id));
}

function deleteMany() {
  return authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(({ input, ctx }) => persons.deleteMany(ctx.auth.tenant_id, input));
}

function deleteOne() {
  return authProcedure.input(idSchema).mutation(({ input, ctx }) => persons.delete(ctx.auth.tenant_id, input));
}

function detachTag() {
  return authProcedure
    .input(z.object({ id: idSchema, tag_name: z.string().trim().min(1, 'Tag name cannot be empty').max(50, 'Tag name too long') }))
    .mutation(({ input, ctx }) =>
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
    .input(z.object({ id: idSchema, options: getAllOptions }))
    .query(({ input, ctx }) => persons.getByHouseholdId(input.id, ctx.auth, input.options));
}

function getById() {
  return authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => persons.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

// Distinct tags
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
  return authProcedure.input(idSchema).query(({ input, ctx }) => persons.getTags(input, ctx.auth));
}

function update() {
  return authProcedure.input(z.object({ id: idSchema, data: UpdatePersonsObj })).mutation(({ input, ctx }) =>
    personsService.updatePerson(input.id, input.data as any, ctx.auth),
  );
}

function removeHousehold() {
  return authProcedure.input(idSchema).mutation(({ input, ctx }) => personsService.removeHousehold(input, ctx.auth));
}

function importMany() {
  const ImportRow = z.object({
    first_name: z.string().trim().max(100).optional(),
    last_name: z.string().trim().max(100).optional(),
    email: z.string().trim().max(255).optional(),
    mobile: z.string().trim().max(30).optional(),
    notes: z.string().trim().max(10000).optional(),
    home_phone: z.string().trim().max(30).optional(),
    street_num: z.string().trim().max(30).optional(),
    street1: z.string().trim().max(150).optional(),
    street2: z.string().trim().max(150).optional(),
    apt: z.string().trim().max(30).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    zip: z.string().trim().max(20).optional(),
    country: z.string().trim().max(100).optional(),
  });

  const Input = z.object({
    rows: z.array(ImportRow),
    tags: z.array(z.string().trim().min(1, 'Tag cannot be empty').max(50, 'Tag too long')).optional(),
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
