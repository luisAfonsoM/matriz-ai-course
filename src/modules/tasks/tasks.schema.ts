import { z } from "zod";

const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "A data deve ser uma representação válida (ex: AAAA-MM-DD ou ISO 8601)",
  });

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: "O título da tarefa é obrigatório" })
    .trim()
    .min(3, "O título da tarefa deve ter pelo menos 3 caracteres")
    .max(150, "O título da tarefa não pode exceder 150 caracteres"),
  description: z
    .string()
    .max(2000, "A descrição da tarefa não pode exceder 2000 caracteres")
    .optional()
    .nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: dateStringSchema.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "O título da tarefa deve ter pelo menos 3 caracteres")
    .max(150, "O título da tarefa não pode exceder 150 caracteres")
    .optional(),
  description: z
    .string()
    .max(2000, "A descrição da tarefa não pode exceder 2000 caracteres")
    .optional()
    .nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: dateStringSchema.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  previousUpdatedAt: z.string().optional().nullable(),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const taskQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assigneeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TaskQueryInput = z.infer<typeof taskQuerySchema>;

export const assignUserSchema = z.object({
  userId: z.string({ required_error: "O identificador do utilizador é obrigatório" }).min(1),
});

export type AssignUserInput = z.infer<typeof assignUserSchema>;

export const createCommentSchema = z.object({
  content: z
    .string({ required_error: "O conteúdo do comentário é obrigatório" })
    .trim()
    .min(1, "O comentário não pode estar vazio nem conter apenas espaços")
    .max(2000, "O comentário não pode exceder 2000 caracteres"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/**
 * Cálculo em runtime do atributo virtual isOverdue (RF11 / R3)
 * Suporta instâncias de Date ou strings ISO de forma defensiva.
 */
export function computeIsOverdue(dueDate: Date | string, status: string): boolean {
  if (status === "DONE") return false;
  const parsedDueDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (isNaN(parsedDueDate.getTime())) return false;
  const now = new Date();
  return now.getTime() > parsedDueDate.getTime();
}
