import { prisma } from "@/lib/prisma";
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryInput,
  computeIsOverdue,
} from "./tasks.schema";

export interface TaskAssigneeInfo {
  id: string;
  taskId: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface TaskWithComputed {
  id: string;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  assignees: TaskAssigneeInfo[];
  commentsCount: number;
}

export interface PaginatedTasksResult {
  tasks: TaskWithComputed[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class TasksService {
  /**
   * Listar tarefas de um projeto com suporte a filtros combinados, paginação e múltiplos responsáveis
   */
  async listTasks(
    projectId: string,
    query: TaskQueryInput
  ): Promise<{ status: "PROJECT_NOT_FOUND" | "SUCCESS"; data?: PaginatedTasksResult }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return { status: "PROJECT_NOT_FOUND" };
    }

    const { status, priority, assigneeId, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      projectId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };

    if (assigneeId) {
      where.OR = [
        { assigneeId },
        { assignments: { some: { userId: assigneeId } } },
      ];
    }

    const total = await prisma.task.count({ where });

    const rawTasks = await prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    const tasks: TaskWithComputed[] = rawTasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      assigneeId: t.assigneeId,
      title: t.title,
      description: t.description,
      priority: t.priority as "LOW" | "MEDIUM" | "HIGH",
      status: t.status as "TODO" | "IN_PROGRESS" | "DONE",
      dueDate: t.dueDate.toISOString(),
      isOverdue: computeIsOverdue(t.dueDate, t.status),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      assignee: t.assignee,
      assignees: t.assignments.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        userId: a.userId,
        assignedAt: a.assignedAt.toISOString(),
        user: a.user,
      })),
      commentsCount: t._count.comments,
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      status: "SUCCESS",
      data: {
        tasks,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    };
  }

  /**
   * Obter detalhes de uma tarefa específica por ID
   */
  async getTaskById(taskId: string): Promise<TaskWithComputed | null> {
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!t) return null;

    return {
      id: t.id,
      projectId: t.projectId,
      assigneeId: t.assigneeId,
      title: t.title,
      description: t.description,
      priority: t.priority as "LOW" | "MEDIUM" | "HIGH",
      status: t.status as "TODO" | "IN_PROGRESS" | "DONE",
      dueDate: t.dueDate.toISOString(),
      isOverdue: computeIsOverdue(t.dueDate, t.status),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      assignee: t.assignee,
      assignees: t.assignments.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        userId: a.userId,
        assignedAt: a.assignedAt.toISOString(),
        user: a.user,
      })),
      commentsCount: t._count.comments,
    };
  }

  /**
   * Criar uma nova tarefa vinculada a um projeto autorizado
   */
  async createTask(
    projectId: string,
    data: CreateTaskInput,
    user: { id: string; role: string }
  ): Promise<{
    status: "PROJECT_NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" | "SUCCESS";
    task?: TaskWithComputed;
    message?: string;
  }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return { status: "PROJECT_NOT_FOUND", message: "Projeto pai não encontrado." };
    }

    if (user.role === "TEAM_MEMBER" && data.dueDate) {
      return {
        status: "FORBIDDEN",
        message: "Apenas o Gestor de Projeto tem permissão para definir ou alterar datas limite.",
      };
    }

    let resolvedAssigneeId = data.assigneeId || null;
    if (user.role === "TEAM_MEMBER") {
      if (data.assigneeId && data.assigneeId !== user.id) {
        return {
          status: "FORBIDDEN",
          message: "Membros de equipa apenas podem associar tarefas a si próprios.",
        };
      }
      resolvedAssigneeId = data.assigneeId === user.id ? user.id : null;
    }

    const resolvedDueDate = data.dueDate ? new Date(data.dueDate) : new Date(project.targetDate);

    if (resolvedDueDate < new Date(project.startDate)) {
      return {
        status: "BAD_REQUEST",
        message: "A data limite da tarefa não pode ser anterior à data de início do projeto pai.",
      };
    }

    const created = await prisma.task.create({
      data: {
        projectId,
        title: data.title,
        description: data.description || null,
        priority: user.role === "PROJECT_MANAGER" ? data.priority : "MEDIUM",
        status: data.status || "TODO",
        dueDate: resolvedDueDate,
        assigneeId: resolvedAssigneeId,
        ...(resolvedAssigneeId
          ? {
              assignments: {
                create: {
                  userId: resolvedAssigneeId,
                },
              },
            }
          : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    return {
      status: "SUCCESS",
      task: {
        id: created.id,
        projectId: created.projectId,
        assigneeId: created.assigneeId,
        title: created.title,
        description: created.description,
        priority: created.priority as "LOW" | "MEDIUM" | "HIGH",
        status: created.status as "TODO" | "IN_PROGRESS" | "DONE",
        dueDate: created.dueDate.toISOString(),
        isOverdue: computeIsOverdue(created.dueDate, created.status),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        assignee: created.assignee,
        assignees: created.assignments.map((a) => ({
          id: a.id,
          taskId: a.taskId,
          userId: a.userId,
          assignedAt: a.assignedAt.toISOString(),
          user: a.user,
        })),
        commentsCount: 0,
      },
    };
  }

  /**
   * Atualizar dados de uma tarefa existente
   */
  async updateTask(
    taskId: string,
    data: UpdateTaskInput,
    user: { id: string; role: string }
  ): Promise<{
    status: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" | "SUCCESS";
    task?: TaskWithComputed;
    message?: string;
  }> {
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!existing) {
      return { status: "NOT_FOUND", message: "Tarefa não encontrada." };
    }

    if (user.role === "TEAM_MEMBER") {
      if (data.dueDate !== undefined && data.dueDate !== null) {
        return {
          status: "FORBIDDEN",
          message: "Apenas o Gestor de Projeto pode alterar a data limite de uma tarefa.",
        };
      }
      if (data.priority !== undefined) {
        return {
          status: "FORBIDDEN",
          message: "Apenas o Gestor de Projeto pode alterar o nível de prioridade da tarefa.",
        };
      }
      if (data.assigneeId !== undefined && data.assigneeId !== user.id && data.assigneeId !== null) {
        return {
          status: "FORBIDDEN",
          message: "Membros de equipa apenas podem atribuir tarefas a si próprios.",
        };
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;

    if (data.assigneeId !== undefined) {
      updateData.assigneeId = data.assigneeId;
      if (data.assigneeId) {
        // Assegurar que também existe o registo em TaskAssignment
        await prisma.taskAssignment.upsert({
          where: { taskId_userId: { taskId, userId: data.assigneeId } },
          create: { taskId, userId: data.assigneeId },
          update: {},
        });
      }
    }

    if (data.dueDate !== undefined && data.dueDate !== null) {
      const newDueDate = new Date(data.dueDate);
      if (newDueDate < new Date(existing.project.startDate)) {
        return {
          status: "BAD_REQUEST",
          message: "A data limite da tarefa não pode ser anterior à data de início do projeto pai.",
        };
      }
      updateData.dueDate = newDueDate;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    return {
      status: "SUCCESS",
      task: {
        id: updated.id,
        projectId: updated.projectId,
        assigneeId: updated.assigneeId,
        title: updated.title,
        description: updated.description,
        priority: updated.priority as "LOW" | "MEDIUM" | "HIGH",
        status: updated.status as "TODO" | "IN_PROGRESS" | "DONE",
        dueDate: updated.dueDate.toISOString(),
        isOverdue: computeIsOverdue(updated.dueDate, updated.status),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        assignee: updated.assignee,
        assignees: updated.assignments.map((a) => ({
          id: a.id,
          taskId: a.taskId,
          userId: a.userId,
          assignedAt: a.assignedAt.toISOString(),
          user: a.user,
        })),
        commentsCount: updated._count.comments,
      },
    };
  }

  /**
   * Eliminar uma tarefa (Apenas Gestor) com remoção em cascata
   */
  async deleteTask(
    taskId: string,
    user: { id: string; role: string }
  ): Promise<{ status: "NOT_FOUND" | "FORBIDDEN" | "SUCCESS"; message?: string }> {
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      return { status: "NOT_FOUND", message: "Tarefa não encontrada." };
    }

    if (user.role !== "PROJECT_MANAGER") {
      return {
        status: "FORBIDDEN",
        message: "Apenas Gestores de Projeto têm permissão para eliminar tarefas.",
      };
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return {
      status: "SUCCESS",
      message: "Tarefa e comentários associados eliminados com sucesso.",
    };
  }

  // ==========================================
  // GESTÃO DE MÚLTIPLOS RESPONSÁVEIS (N:M)
  // ==========================================

  /**
   * Obter todos os responsáveis atribuídos a uma tarefa
   */
  async getTaskAssignees(taskId: string): Promise<{
    status: "NOT_FOUND" | "SUCCESS";
    assignees?: TaskAssigneeInfo[];
    message?: string;
  }> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { status: "NOT_FOUND", message: "Tarefa não encontrada." };
    }

    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { assignedAt: "asc" },
    });

    return {
      status: "SUCCESS",
      assignees: assignments.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        userId: a.userId,
        assignedAt: a.assignedAt.toISOString(),
        user: a.user,
      })),
    };
  }

  /**
   * Associar novo responsável à tarefa (impede duplicados)
   */
  async assignUserToTask(
    taskId: string,
    targetUserId: string,
    currentUser: { id: string; role: string }
  ): Promise<{
    status: "TASK_NOT_FOUND" | "USER_NOT_FOUND" | "ALREADY_ASSIGNED" | "FORBIDDEN" | "SUCCESS";
    assignment?: TaskAssigneeInfo;
    message?: string;
  }> {
    // 1. Validar existência da tarefa
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { status: "TASK_NOT_FOUND", message: "Tarefa não encontrada." };
    }

    // 2. Validar existência e elegibilidade do utilizador alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return { status: "USER_NOT_FOUND", message: "Utilizador não encontrado na organização." };
    }

    // 3. Regra RBAC: Membro de equipa só pode auto-atribuir
    if (currentUser.role === "TEAM_MEMBER" && targetUserId !== currentUser.id) {
      return {
        status: "FORBIDDEN",
        message: "Membros de equipa apenas podem associar-se a si próprios como responsáveis.",
      };
    }

    // 4. Impedir repetição da associação entre a mesma tarefa e o mesmo utilizador
    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    if (existingAssignment) {
      return {
        status: "ALREADY_ASSIGNED",
        message: "O utilizador já se encontra atribuído como responsável a esta tarefa.",
      };
    }

    // 5. Criar registo de atribuição N:M
    const newAssignment = await prisma.taskAssignment.create({
      data: {
        taskId,
        userId: targetUserId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Se task.assigneeId estiver vazio, atualiza também o responsável primário
    if (!task.assigneeId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { assigneeId: targetUserId },
      });
    }

    return {
      status: "SUCCESS",
      assignment: {
        id: newAssignment.id,
        taskId: newAssignment.taskId,
        userId: newAssignment.userId,
        assignedAt: newAssignment.assignedAt.toISOString(),
        user: newAssignment.user,
      },
    };
  }

  /**
   * Remover atribuição de responsável de uma tarefa
   */
  async unassignUserFromTask(
    taskId: string,
    targetUserId: string,
    currentUser: { id: string; role: string }
  ): Promise<{
    status: "NOT_FOUND" | "FORBIDDEN" | "SUCCESS";
    message?: string;
  }> {
    // 1. Validar existência da atribuição
    const assignment = await prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    if (!assignment) {
      return { status: "NOT_FOUND", message: "Atribuição não encontrada para esta tarefa." };
    }

    // 2. Regra RBAC: Membro de equipa só pode remover a sua própria atribuição
    if (currentUser.role === "TEAM_MEMBER" && targetUserId !== currentUser.id) {
      return {
        status: "FORBIDDEN",
        message: "Membros de equipa apenas podem remover as suas próprias atribuições.",
      };
    }

    // 3. Eliminar registo de atribuição
    await prisma.taskAssignment.delete({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    // Sincronizar assigneeId primário se coincidia com o removido
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: { take: 1 } },
    });

    if (task && task.assigneeId === targetUserId) {
      const remainingAssignment = task.assignments[0];
      await prisma.task.update({
        where: { id: taskId },
        data: { assigneeId: remainingAssignment ? remainingAssignment.userId : null },
      });
    }

    return {
      status: "SUCCESS",
      message: "Atribuição removida com sucesso.",
    };
  }
}

export const tasksService = new TasksService();
