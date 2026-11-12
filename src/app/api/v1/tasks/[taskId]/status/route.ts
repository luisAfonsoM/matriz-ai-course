import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/modules/auth/auth.service";
import { updateTaskStatusSchema, computeIsOverdue } from "@/modules/tasks/tasks.schema";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    await requireAuth(request);

    const existingTask = await prisma.task.findUnique({
      where: { id: params.taskId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: "Tarefa não encontrada.",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateTaskStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados de atualização de estado inválidos.",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { status, previousUpdatedAt } = result.data;

    // Controlo de concorrência otimista (EC04): verificar se a tarefa foi alterada entretanto
    if (previousUpdatedAt) {
      const knownTimestamp = new Date(previousUpdatedAt).getTime();
      const currentTimestamp = new Date(existingTask.updatedAt).getTime();

      if (currentTimestamp > knownTimestamp) {
        return NextResponse.json(
          {
            statusCode: 409,
            error: "Conflict",
            message: "A tarefa já foi atualizada por outro utilizador. Por favor recarregue o quadro Kanban.",
            timestamp: new Date().toISOString(),
          },
          { status: 409 }
        );
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.taskId },
      data: { status },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const responsePayload = {
      ...updatedTask,
      isOverdue: computeIsOverdue(updatedTask.dueDate, updatedTask.status),
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota PATCH /api/v1/tasks/[taskId]/status:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao atualizar o estado da tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
