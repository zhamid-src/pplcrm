import { z } from 'zod';
import { nameSchema, optionalNameSchema, optionalIdSchema } from './core.schema';

export const AddTaskObj = z.object({
  name: nameSchema('Task name', 200),
  details: z.string().trim().max(10000, 'Details too long').optional(),
  due_at: z.coerce.date().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'canceled', 'archived']).default('todo').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: optionalIdSchema,
});

export const TasksObj = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string().optional(),
  due_at: z.coerce.date().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'canceled', 'archived']).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable().optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: z.string().optional(),
});

export const UpdateTaskObj = z.object({
  name: optionalNameSchema('Task name', 200),
  details: z.string().trim().max(10000, 'Details too long').optional(),
  due_at: z.coerce.date().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'canceled', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: optionalIdSchema,
});
