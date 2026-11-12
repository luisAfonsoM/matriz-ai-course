import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/modules/auth/auth.service";
import { updateProjectSchema } from "@/modules/projects/projects.schema";
import { projectsService } from "@/modules/projects/projects.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth(request);

    const project = await projectsService.getProjectById(params.projectId);

    if (!project) {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: "Projeto não encontrado.",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(project, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/projects/[projectId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao obter os detalhes do projeto.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. Verificar autorização RBAC
    const user = await requireRole(request, ["PROJECT_MANAGER"]);

    // 2. Validar payload de edição
    const body = await request.json();
    const result = updateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados de atualização do projeto inválidos.",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 3. Executar atualização via serviço
    const outcome = await projectsService.updateProject(params.projectId, result.data, user);

    if (outcome.status === "NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: outcome.message || "Projeto não encontrado.",
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

    return NextResponse.json(outcome.project, { status: 200 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota PUT /api/v1/projects/[projectId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao atualizar o projeto.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    // 1. Verificar autorização RBAC
    const user = await requireRole(request, ["PROJECT_MANAGER"]);

    // 2. Executar eliminação em cascata via serviço (evita órfãos)
    const outcome = await projectsService.deleteProject(params.projectId, user);

    if (outcome.status === "NOT_FOUND") {
      return NextResponse.json(
        {
          statusCode: 404,
          error: "Not Found",
          message: outcome.message || "Projeto não encontrado.",
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
      { message: outcome.message || "Projeto e tarefas associadas eliminados com sucesso." },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota DELETE /api/v1/projects/[projectId]:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao eliminar o projeto.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
