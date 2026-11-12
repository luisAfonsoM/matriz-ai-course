import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/modules/auth/auth.service";
import { createProjectSchema, projectQuerySchema } from "@/modules/projects/projects.schema";
import { projectsService } from "@/modules/projects/projects.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const query = projectQuerySchema.parse({
      search: searchParams.get("search") || "",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
    });

    const result = await projectsService.listProjects(query, user);

    const response = NextResponse.json(result, { status: 200 });
    response.headers.set("X-Total-Count", String(result.pagination.total));
    response.headers.set("X-Page", String(result.pagination.page));
    response.headers.set("X-Total-Pages", String(result.pagination.totalPages));

    return response;
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/projects:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao listar os projetos.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. RBAC: Apenas Gestor de Projeto pode criar novos projetos
    const user = await requireRole(request, ["PROJECT_MANAGER"]);

    // 2. Validar payload com schema Zod
    const body = await request.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados de criação do projeto inválidos.",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // 3. Inferir managerId com base na sessão autenticada
    const newProject = await projectsService.createProject(result.data, user.id);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota POST /api/v1/projects:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro ao criar o projeto.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
