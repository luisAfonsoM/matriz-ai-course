import { prisma } from "@/lib/prisma";
import { CreateProjectInput, UpdateProjectInput, ProjectQueryInput } from "./projects.schema";

export interface ProjectWithProgress {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  targetDate: string;
  status: string;
  managerId: string;
  manager: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedProjectsResult {
  projects: ProjectWithProgress[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ProjectsService {
  /**
   * Listar projetos com suporte a pesquisa por nome e paginação
   */
  async listProjects(
    query: ProjectQueryInput,
    user?: { id: string; role: string }
  ): Promise<PaginatedProjectsResult> {
    const { search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search && search.trim() !== "") {
      where.title = {
        contains: search.trim(),
      };
    }

    // Contagem total para cálculo de páginas
    const total = await prisma.project.count({ where });

    // Consulta paginada com tarefas para cálculo em runtime do progresso
    const rawProjects = await prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        manager: {
          select: { id: true, name: true, email: true, role: true },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    const projects: ProjectWithProgress[] = rawProjects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
      // Prevenção explícita de divisão por zero (EC01)
      const progressPercentage =
        totalTasks === 0
          ? 0.0
          : Math.round((completedTasks / totalTasks) * 100 * 10) / 10;

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        startDate: p.startDate.toISOString(),
        targetDate: p.targetDate.toISOString(),
        status: p.status,
        managerId: p.managerId,
        manager: p.manager,
        progressPercentage,
        totalTasks,
        completedTasks,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      projects,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Obter detalhes de um projeto específico por ID
   */
  async getProjectById(projectId: string): Promise<ProjectWithProgress | null> {
    const p = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        manager: {
          select: { id: true, name: true, email: true, role: true },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    if (!p) return null;

    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
    const progressPercentage =
      totalTasks === 0
        ? 0.0
        : Math.round((completedTasks / totalTasks) * 100 * 10) / 10;

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      startDate: p.startDate.toISOString(),
      targetDate: p.targetDate.toISOString(),
      status: p.status,
      managerId: p.managerId,
      manager: p.manager,
      progressPercentage,
      totalTasks,
      completedTasks,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  /**
   * Criar um novo projeto associado ao Gestor autenticado
   */
  async createProject(
    data: CreateProjectInput,
    managerId: string
  ): Promise<ProjectWithProgress> {
    const created = await prisma.project.create({
      data: {
        title: data.title,
        description: data.description || null,
        startDate: new Date(data.startDate),
        targetDate: new Date(data.targetDate),
        status: "ACTIVE",
        managerId,
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true, role: true },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    return {
      id: created.id,
      title: created.title,
      description: created.description,
      startDate: created.startDate.toISOString(),
      targetDate: created.targetDate.toISOString(),
      status: created.status,
      managerId: created.managerId,
      manager: created.manager,
      progressPercentage: 0.0,
      totalTasks: 0,
      completedTasks: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Atualizar dados de um projeto existente (Apenas Gestor)
   */
  async updateProject(
    projectId: string,
    data: UpdateProjectInput,
    user: { id: string; role: string }
  ): Promise<{ status: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" | "SUCCESS"; project?: ProjectWithProgress; message?: string }> {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: { status: true },
        },
      },
    });

    if (!existing) {
      return { status: "NOT_FOUND", message: "Projeto não encontrado." };
    }

    // Apenas Gestor de Projeto pode editar
    if (user.role !== "PROJECT_MANAGER") {
      return {
        status: "FORBIDDEN",
        message: "Acesso recusado. Apenas utilizadores com papel de Gestor de Projeto podem editar projetos.",
      };
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);
    if (data.status !== undefined) updateData.status = data.status;

    // Validação temporal entre data de início e conclusão (existente ou atualizada)
    const effectiveStart = updateData.startDate || existing.startDate;
    const effectiveTarget = updateData.targetDate || existing.targetDate;
    if (effectiveTarget < effectiveStart) {
      return {
        status: "BAD_REQUEST",
        message: "A data de conclusão prevista deve ser igual ou posterior à data de início do projeto.",
      };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        manager: {
          select: { id: true, name: true, email: true, role: true },
        },
        tasks: {
          select: { status: true },
        },
      },
    });

    const totalTasks = updated.tasks.length;
    const completedTasks = updated.tasks.filter((t) => t.status === "DONE").length;
    const progressPercentage =
      totalTasks === 0
        ? 0.0
        : Math.round((completedTasks / totalTasks) * 100 * 10) / 10;

    return {
      status: "SUCCESS",
      project: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        startDate: updated.startDate.toISOString(),
        targetDate: updated.targetDate.toISOString(),
        status: updated.status,
        managerId: updated.managerId,
        manager: updated.manager,
        progressPercentage,
        totalTasks,
        completedTasks,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Eliminar um projeto e registos dependentes em cascata (Apenas Gestor)
   */
  async deleteProject(
    projectId: string,
    user: { id: string; role: string }
  ): Promise<{ status: "NOT_FOUND" | "FORBIDDEN" | "SUCCESS"; message?: string }> {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      return { status: "NOT_FOUND", message: "Projeto não encontrado." };
    }

    if (user.role !== "PROJECT_MANAGER") {
      return {
        status: "FORBIDDEN",
        message: "Acesso recusado. Apenas utilizadores com papel de Gestor de Projeto podem eliminar projetos.",
      };
    }

    // A eliminação de Project elimina tarefas e comentários em cascata (onDelete: Cascade)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return {
      status: "SUCCESS",
      message: "Projeto e tarefas associadas eliminados com sucesso.",
    };
  }
}

export const projectsService = new ProjectsService();
