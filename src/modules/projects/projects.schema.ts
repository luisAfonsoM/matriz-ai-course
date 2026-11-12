import { z } from "zod";

// Helper para validar datas (aceita quer YYYY-MM-DD quer ISO 8601 completo)
const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "A data deve ser uma representação válida (ex: AAAA-MM-DD ou ISO 8601)",
  });

export const createProjectSchema = z
  .object({
    title: z
      .string({ required_error: "O título do projeto é obrigatório" })
      .trim()
      .min(3, "O título do projeto deve ter pelo menos 3 caracteres")
      .max(100, "O título do projeto não pode exceder 100 caracteres"),
    description: z
      .string()
      .max(1000, "A descrição do projeto não pode exceder 1000 caracteres")
      .optional()
      .nullable(),
    startDate: dateStringSchema,
    targetDate: dateStringSchema,
  })
  .refine(
    (data) => new Date(data.targetDate) >= new Date(data.startDate),
    {
      message: "A data de conclusão prevista deve ser igual ou posterior à data de início do projeto",
      path: ["targetDate"],
    }
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "O título do projeto deve ter pelo menos 3 caracteres")
      .max(100, "O título do projeto não pode exceder 100 caracteres")
      .optional(),
    description: z
      .string()
      .max(1000, "A descrição do projeto não pode exceder 1000 caracteres")
      .optional()
      .nullable(),
    startDate: dateStringSchema.optional(),
    targetDate: dateStringSchema.optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.targetDate) {
        return new Date(data.targetDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "A data de conclusão prevista deve ser igual ou posterior à data de início do projeto",
      path: ["targetDate"],
    }
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectQuerySchema = z.object({
  search: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
