import { z } from 'zod';

export const sortModelItem = z
  .object({
    colId: z.string(),
    sort: z.enum(['asc', 'desc']),
  })
  .optional();

/**
 * The list of options that are used to filter the list of rows
 * when getting rows from the database.
 */
export const getAllOptions = z
  .object({
    searchStr: z.string().optional(),
    startRow: z.number().optional(),
    endRow: z.number().optional(),
    sortModel: z.array(sortModelItem).optional(),
    filterModel: z.record(z.string(), z.unknown()).optional(),
    includeArchived: z.boolean().optional(),
    columns: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    orderBy: z.array(z.string()).optional(),
    groupBy: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    issues: z.array(z.string()).optional(),
    type: z.enum(['tag', 'issue']).optional(),
    userId: z.string().optional(),
    entity: z.string().optional(),
    activity: z.string().optional(),
    advancedFilterModel: z
      .object({
        conjunction: z.enum(['AND', 'OR']),
        rules: z.array(
          z.object({
            field: z.string(),
            op: z.string(),
            value: z.unknown(),
          }),
        ),
      })
      .optional(),
  })
  .optional();

export const exportCsvInput = z
  .object({
    options: getAllOptions,
    columns: z.array(z.string()).optional(),
    fileName: z.string().optional(),
  })
  .optional();

export const exportCsvResponse = z.object({
  csv: z.string(),
  fileName: z.string(),
  columns: z.array(z.string()),
  rowCount: z.number(),
});

export const dbIdSchema = z.string().regex(/^\d+$/, 'Invalid ID format');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const idSchema = dbIdSchema;

export const addressSchema = z.object({
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  formatted_address: z.string().trim().max(500, 'Address is too long').nullable().optional(),
  type: z.string().trim().max(50, 'Type is too long').nullable().optional(),
  apt: z.string().trim().max(30, 'Apt is too long').nullable().optional(),
  street_num: z.string().trim().max(30, 'Street number is too long').nullable().optional(),
  street1: z.string().trim().max(150, 'Street 1 is too long').nullable().optional(),
  street2: z.string().trim().max(150, 'Street 2 is too long').nullable().optional(),
  city: z.string().trim().max(100, 'City is too long').nullable().optional(),
  state: z.string().trim().max(100, 'State is too long').nullable().optional(),
  zip: z.string().trim().max(20, 'Zip is too long').nullable().optional(),
  country: z.string().trim().max(100, 'Country is too long').nullable().optional(),
});

export const nameSchema = (fieldName: string, maxLen = 100) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLen, `${fieldName} is too long`);

export const descriptionSchema = (maxLen = 1000) =>
  z.string().trim().max(maxLen, 'Description is too long').nullable().optional();

export const emailSchema = z.string().trim().max(320, 'Email is too long').email('Invalid email address');

export const nullableEmailSchema = emailSchema.or(z.literal('')).nullable().optional();
export const phoneSchema = (fieldName: string) => z.string().trim().max(30, `${fieldName} is too long`).nullable().optional();

export const notesSchema = z.string().trim().max(10000, 'Notes are too long').nullable().optional();
export const jsonSchema = z.string().trim().max(50000, 'JSON is too long').nullable().optional();
