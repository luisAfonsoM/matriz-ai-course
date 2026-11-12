import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/modules/auth/auth.service";
import { computeIsOverdue } from "@/modules/tasks/tasks.schema";
import { createErrorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/projects/[projectId]/metrics
 * Retorna as métricas operacionais agregadas do projeto em tempo real:
 * - Percentagem ponderada de progresso (com proteção contra divisão por zero - EC01)
 * - Contagens por estado (TODO, IN_PROGRESS, DONE)
 * - Contagem e lista de tarefas em atraso (isOverdue) e tarefas críticas
 * - Série de velocidade dos últimos 7 dias (RF12)
 */
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth(request);

    // 1. Verificar se o projeto existe
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, title: true },
    });

    if (!project) {
      return createErrorResponse(404, "Not Found", "Projeto não encontrado.");
    }

    // 2. Obter todas as tarefas do projeto
    const tasks = await prisma.task.findMany({
      where: { projectId: params.projectId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todoTasks = tasks.filter((t) => t.status === "TODO").length;

    // Cálculo seguro de percentagem (EC01: 0% se totalTasks === 0)
    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Identificar tarefas em atraso e tarefas críticas (em atraso ou a expirar hoje)
    let overdueTasksCount = 0;
    const criticalTasks: any[] = [];

    for (const t of tasks) {
      const isOverdue = computeIsOverdue(t.dueDate, t.status);
      if (isOverdue) overdueTasksCount++;

      const isExpiringToday =
        t.status !== "DONE" &&
        new Date(t.dueDate).getTime() <= endOfToday.getTime();

      if (isOverdue || isExpiringToday) {
        criticalTasks.push({
          id: t.id,
          projectId: t.projectId,
          assigneeId: t.assigneeId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate.toISOString(),
          isOverdue,
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
        });
      }
    }

    // 3. Velocidade Semanal (Últimos 7 dias em UTC)
    // Para cada dia dos últimos 7 dias, contar quantas tarefas concluídas foram atualizadas nesse dia
    const weeklyVelocity: Array<{ date: string; completedCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setUTCDate(targetDate.getUTCDate() - i);
      const dateString = targetDate.toISOString().split("T")[0];

      // Contar tarefas com estado DONE atualizadas nesta data
      const completedOnDate = tasks.filter((t) => {
        if (t.status !== "DONE") return false;
        const taskUpdatedDate = new Date(t.updatedAt).toISOString().split("T")[0];
        return taskUpdatedDate === dateString;
      }).length;

      weeklyVelocity.push({
        date: dateString,
        completedCount: completedOnDate,
      });
    }

    return NextResponse.json(
      {
        projectId: params.projectId,
        progressPercentage,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasksCount,
        weeklyVelocity,
        criticalTasks,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("Erro na rota GET /api/v1/projects/[projectId]/metrics:", error);
    return createErrorResponse(500, "Internal Server Error", "Ocorreu um erro ao obter as métricas do projeto.");
  }
}
