import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth/auth.service";
import { updateTaskSchema } from "@/modules/tasks/tasks.schema";
import { tasksService } from "@/modules/tasks/tasks.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    await requireAuth(request);

    const task = await tasksService.getTaskById(params.taskId);

    if (!task) {
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

    return NextResponse.json(task, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/tasks/[taskId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao obter os detalhes da tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados de atualização da tarefa inválidos.",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const outcome = await tasksService.updateTask(params.taskId, result.data, user);

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

    if (outcome.status === "BAD_REQUEST") {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: outcome.message || "Dados inválidos.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(outcome.task, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota PUT /api/v1/tasks/[taskId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao atualizar a tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await requireAuth(request);

    const outcome = await tasksService.deleteTask(params.taskId, user);

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
      { message: outcome.message || "Tarefa eliminada com sucesso." },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota DELETE /api/v1/tasks/[taskId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao eliminar a tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
