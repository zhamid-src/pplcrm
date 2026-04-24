import { z } from 'zod';

export const AddTaskObj = z.object({
  name: z.string(),
  details: z.string().optional(),
  due_at: z.coerce.date().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'canceled', 'archived']).default('todo').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: z.string().optional(),
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
  name: z.string().optional(),
  details: z.string().optional(),
  due_at: z.coerce.date().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'canceled', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: z.string().nullable().optional(),
});
