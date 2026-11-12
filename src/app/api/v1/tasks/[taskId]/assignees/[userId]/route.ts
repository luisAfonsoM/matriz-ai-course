import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth/auth.service";
import { tasksService } from "@/modules/tasks/tasks.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string; userId: string } }
) {
  try {
    const user = await requireAuth(request);

    const outcome = await tasksService.unassignUserFromTask(
      params.taskId,
      params.userId,
      user
    );

    if (outcome.status === "NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: outcome.message || "Atribuição não encontrada.",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (outcome.status === "FORBIDDEN") {
      return NextResponse.json(
        {
          statusCode: 403,
          error: "Forbidden",
          message: outcome.message || "Acesso recusado.",
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { message: outcome.message || "Atribuição removida com sucesso." },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota DELETE /api/v1/tasks/[taskId]/assignees/[userId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao remover a atribuição do responsável.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
