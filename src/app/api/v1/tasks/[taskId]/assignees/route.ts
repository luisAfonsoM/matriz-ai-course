import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth/auth.service";
import { assignUserSchema } from "@/modules/tasks/tasks.schema";
import { tasksService } from "@/modules/tasks/tasks.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    await requireAuth(request);

    const outcome = await tasksService.getTaskAssignees(params.taskId);

    if (outcome.status === "NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: outcome.message || "Tarefa não encontrada.",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(outcome.assignees, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/tasks/[taskId]/assignees:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao obter os responsáveis da tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const result = assignUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados de atribuição inválidos.",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const outcome = await tasksService.assignUserToTask(params.taskId, result.data.userId, user);

    if (outcome.status === "TASK_NOT_FOUND" || outcome.status === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: outcome.message || "Recurso não encontrado.",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (outcome.status === "ALREADY_ASSIGNED") {
      return NextResponse.json(
        {
          statusCode: 409,
          error: "Conflict",
          message: outcome.message || "O utilizador já se encontra atribuído a esta tarefa.",
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
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

    return NextResponse.json(outcome.assignment, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota POST /api/v1/tasks/[taskId]/assignees:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao associar o responsável à tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
