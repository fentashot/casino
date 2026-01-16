import { z } from "zod"

export const expenseSchema = z.object({
  id: z.number().int().positive(),
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters' })
    .max(100, { message: 'Title must be at most 100 characters' }),
  amount: z.number().positive(),
  date: z.string(),
})

export const createExpenseSchema = expenseSchema.omit({ id: true });

export const betTypeSchema = z.enum([
  'straight',
  'split',
  'street',
  'corner',
  'line',
  'column',
  'dozen',
  'even_odd',
  'red_black',
  'high_low'
]);

export const choiceSchema = z.union([
  z.enum(['even', 'odd']),
  z.enum(['red', 'black']),
  z.enum(['low', 'high']),
  z.enum(['col1', 'col2', 'col3']),
  z.enum(['1st12', '2nd12', '3rd12']),
]).optional();

export const betSchema = z.object({
  type: betTypeSchema,
  numbers: z.array(z.number().int().min(0).max(36)),
  amount: z.number().int().positive(),
  color: z.enum(['red', 'black']).optional(),
  choice: choiceSchema,
});

export const spinRequestSchema = z.object({
  bets: z.array(betSchema),
  clientSeed: z.string().min(1),
  nonce: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(16).max(64).optional(),
});