import { toTRPCError } from '../../errors/to-trpc-errors';

/** Wrap any tRPC resolver impl so domain errors become TRPCError */
export const wrapTrpc = <T extends (args: any) => any>(fn: T): T =>
  (async (args: any) => {
    try {
      return await fn(args);
    } catch (e) {
      throw toTRPCError(e);
    }
  }) as T;
