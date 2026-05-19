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
    filterModel: z.record(z.string(), z.any()).optional(),
    includeArchived: z.boolean().optional(),
    columns: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    orderBy: z.array(z.string()).optional(),
    groupBy: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    advancedFilterModel: z
      .object({
        conjunction: z.enum(['AND', 'OR']),
        rules: z.array(
          z.object({
            field: z.string(),
            op: z.string(),
            value: z.any(),
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

export const idSchema = z.string().regex(/^\d+$/, 'Invalid ID format');

export const nameSchema = (fieldName: string, maxLen = 100) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLen, `${fieldName} is too long`);

export const descriptionSchema = (maxLen = 1000) =>
  z.string().trim().max(maxLen, 'Description is too long').nullable().optional();

export const emailSchema = z.string().trim().max(320, 'Email is too long').email('Invalid email address');
export const phoneSchema = (fieldName: string) => z.string().trim().max(30, `${fieldName} is too long`).nullish();

export const notesSchema = z.string().trim().max(10000, 'Notes are too long').nullish();
export const jsonSchema = z.string().trim().max(50000, 'JSON is too long').nullish();
