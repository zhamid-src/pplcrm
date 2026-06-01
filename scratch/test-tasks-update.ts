import { TasksRouter } from '../apps/backend/src/app/modules/tasks/trpc.router';

const caller = TasksRouter.createCaller({
  auth: { tenant_id: '1', user_id: '1', session_id: 's1' } as any
} as any);

async function run() {
  try {
    // Try to replicate the update call with data
    const result = await caller.update({
      id: '18',
      data: { assigned_to: '1' }
    });
    console.log('Success:', result);
  } catch (err: any) {
    console.log('Error name:', err.name);
    console.log('Error message:', err.message);
    if (err.cause) {
      console.log('Error cause:', err.cause);
    }
    // Print Zod error details if it's a ZodError
    if (err.cause?.issues) {
      console.log('Zod Issues:', JSON.stringify(err.cause.issues, null, 2));
    }
  }
}

run();
