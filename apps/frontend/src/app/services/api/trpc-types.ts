import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { TRPCRouter } from '../../../../../backend/src/app/modules/trpc';

export type RouterInputs = inferRouterInputs<TRPCRouter>;
export type RouterOutputs = inferRouterOutputs<TRPCRouter>;
