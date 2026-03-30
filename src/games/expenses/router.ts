import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createExpenseSchema, expenseIdSchema } from "../../zodTypes";
import type { User, Vars } from "../../types";
import { mapResultToResponse, mapResultToResponseWithStatus } from "../../lib/errors";
import * as ExpenseService from "./service";

export const expensesRouter = new Hono<Vars>()

    .get("/", async (c) => {
        const { id } = c.get("user") as User;
        const result = await ExpenseService.listExpenses(id);
        return mapResultToResponse(c, result);
    })

    .post("/", zValidator("json", createExpenseSchema), async (c) => {
        const expense = c.req.valid("json");
        const { id } = c.get("user") as User;
        const result = await ExpenseService.createExpense(id, expense);
        return mapResultToResponseWithStatus(c, result, 201);
    })

    .delete("/:id", zValidator("param", expenseIdSchema), async (c) => {
        const { id } = c.req.valid("param");
        const result = await ExpenseService.deleteExpense(id);
        return mapResultToResponse(c, result);
    })

    .get("/total", async (c) => {
        const { id } = c.get("user") as User;
        const result = await ExpenseService.getTotal(id);
        return mapResultToResponse(c, result);
    });
