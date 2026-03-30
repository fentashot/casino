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
  amount: z.number().int().positive().max(100_000),
  color: z.enum(['red', 'black']).optional(),
  choice: choiceSchema,
}).superRefine((bet, ctx) => {
  switch (bet.type) {
    case "straight":
      if (bet.numbers.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Straight bet requires exactly 1 number",
        });
      }
      break;
    case "split":
      if (bet.numbers.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Split bet requires exactly 2 numbers",
        });
      }
      break;
    case "street":
      if (bet.numbers.length !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Street bet requires exactly 3 numbers",
        });
      }
      break;
    case "corner":
      if (bet.numbers.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Corner bet requires exactly 4 numbers",
        });
      }
      break;
    case "line":
      if (bet.numbers.length !== 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Line bet requires exactly 6 numbers",
        });
      }
      break;
    case "column":
      if (!bet.choice || !["col1", "col2", "col3"].includes(bet.choice)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choice"],
          message: "Column bet requires choice: col1, col2, or col3",
        });
      }
      if (bet.numbers.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Column bet should not include numbers",
        });
      }
      break;
    case "dozen":
      if (!bet.choice || !["1st12", "2nd12", "3rd12"].includes(bet.choice)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choice"],
          message: "Dozen bet requires choice: 1st12, 2nd12, or 3rd12",
        });
      }
      if (bet.numbers.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Dozen bet should not include numbers",
        });
      }
      break;
    case "even_odd":
      if (!bet.choice || !["even", "odd"].includes(bet.choice)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choice"],
          message: "Even/Odd bet requires choice: even or odd",
        });
      }
      if (bet.numbers.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Even/Odd bet should not include numbers",
        });
      }
      break;
    case "red_black":
      if (!bet.color) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["color"],
          message: "Red/Black bet requires color",
        });
      }
      if (bet.numbers.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "Red/Black bet should not include numbers",
        });
      }
      break;
    case "high_low":
      if (!bet.choice || !["low", "high"].includes(bet.choice)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choice"],
          message: "High/Low bet requires choice: low or high",
        });
      }
      if (bet.numbers.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["numbers"],
          message: "High/Low bet should not include numbers",
        });
      }
      break;
  }
});

export const spinRequestSchema = z.object({
  bets: z.array(betSchema),
  clientSeed: z.string().min(1),
  nonce: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(16).max(64),
});

// Expense ID validation (used in routes)
export const expenseIdSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive number"),
});
