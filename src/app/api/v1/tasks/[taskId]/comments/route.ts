import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/modules/auth/auth.service";
import { createCommentSchema } from "@/modules/tasks/tasks.schema";
import { createErrorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/tasks/[taskId]/comments
 * Lista todos os comentários cronologicamente (ascendente) com autor e data/hora.
 */
export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    await requireAuth(request);

    // Verificar se a tarefa existe
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
      select: { id: true },
    });

    if (!task) {
      return createErrorResponse(404, "Not Found", "Tarefa não encontrada.");
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: params.taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/tasks/[taskId]/comments:", error);
    return createErrorResponse(500, "Internal Server Error", "Ocorreu um erro ao obter os comentários.");
  }
}

/**
 * POST /api/v1/tasks/[taskId]/comments
 * Regista um novo comentário na tarefa.
 * Valida 1-2000 carateres (rejeitando apenas espaços) e infere o autor no backend.
 */
export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    // 1. Obter utilizador autenticado a partir da sessão (inferência de identidade)
    const user = await requireAuth(request);

    // 2. Verificar se a tarefa existe
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
      select: { id: true },
    });

    if (!task) {
      return createErrorResponse(404, "Not Found", "Tarefa não encontrada.");
    }

    // 3. Validar corpo do pedido com schema defensivo Zod
    const body = await request.json().catch(() => ({}));
    const result = createCommentSchema.safeParse(body);

    if (!result.success) {
      return createErrorResponse(
        400,
        "Bad Request",
        "Conteúdo do comentário inválido.",
        result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      );
    }

    // 4. Inferir authorId e data DIRETAMENTE no Backend (Anti-spoofing / Requisito 3)
    const newComment = await prisma.comment.create({
      data: {
        taskId: params.taskId,
        content: result.data.content,
        authorId: user.id, // Ignora qualquer authorId enviado no payload do cliente
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota POST /api/v1/tasks/[taskId]/comments:", error);
    return createErrorResponse(500, "Internal Server Error", "Ocorreu um erro ao registar o comentário.");
  }
}
