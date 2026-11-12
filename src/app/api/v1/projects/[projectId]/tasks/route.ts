import { NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth/auth.service";
import { createTaskSchema, taskQuerySchema } from "@/modules/tasks/tasks.schema";
import { tasksService } from "@/modules/tasks/tasks.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = taskQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      assigneeId: searchParams.get("assigneeId") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    const result = await tasksService.listTasks(params.projectId, query);

    if (result.status === "PROJECT_NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: "Projeto pai não encontrado.",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const response = NextResponse.json(result.data, { status: 200 });
    if (result.data?.pagination) {
      response.headers.set("X-Total-Count", String(result.data.pagination.total));
      response.headers.set("X-Page", String(result.data.pagination.page));
      response.headers.set("X-Total-Pages", String(result.data.pagination.totalPages));
    }

    return response;
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/projects/[projectId]/tasks:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao listar as tarefas.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados da tarefa inválidos.",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const outcome = await tasksService.createTask(params.projectId, result.data, user);

    if (outcome.status === "PROJECT_NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: outcome.message || "Projeto pai não encontrado.",
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

    return NextResponse.json(outcome.task, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota POST /api/v1/projects/[projectId]/tasks:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao registar a tarefa.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
