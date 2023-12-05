import { supabase } from '@backend/supabase';
import { z } from 'zod';
import { trpc } from '../../trpc';
import { UsersOperator } from '../db.operators/users.operator';

const operator = new UsersOperator();
const publicProcedure = trpc.procedure;
const router = trpc.router;

export const authRouter = router({
  signUp: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(4) }))
    .mutation(async (data) => {
      const payload = await supabase.auth.signUp(data.input);
      return payload.data.user;
    }),
  signIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(4) }))
    .mutation(async (data) => {
      return supabase.auth.signInWithPassword(data.input);
    }),
  signOut: publicProcedure.mutation(() => {
    return supabase.auth.signOut();
  }),
});

export type AuthRouter = typeof authRouter;
