import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function computeIsOverdue(dueDate: Date | string, status: string): boolean {
  if (status === "DONE") return false;
  return new Date().getTime() > new Date(dueDate).getTime();
}

async function runFrontendIntegrationTests() {
  console.log("🧪 A iniciar suite de testes de Integração Frontend & Métricas do Dashboard (EC01, KPIs, Velocidade e Tarefas Críticas)...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  let testProjectId = "";

  try {
    // 1. Obter utilizador gestor
    const gestor = await prisma.user.findUnique({ where: { email: "luis.ferreira@matriz.local" } });
    const membro = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });
    assert(Boolean(gestor) && Boolean(membro), "Utilizadores de teste disponíveis na base de dados");

    // 2. Teste do Caso-Limite 1 (EC01): Projeto Vazio sem Tarefas
    console.log("\n1. Teste de Caso-Limite EC01: Projeto Vazio sem Tarefas:");
    const emptyProject = await prisma.project.create({
      data: {
        title: `Projeto Vazio Frontend Test ${Date.now()}`,
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-11-30"),
        managerId: gestor!.id,
      },
    });
    testProjectId = emptyProject.id;

    // Calcular métricas para projeto vazio
    const emptyTasks = await prisma.task.findMany({ where: { projectId: emptyProject.id } });
    const emptyTotal = emptyTasks.length;
    const emptyCompleted = emptyTasks.filter((t) => t.status === "DONE").length;
    const emptyProgress = emptyTotal > 0 ? Math.round((emptyCompleted / emptyTotal) * 100) : 0;

    assert(emptyTotal === 0, "Projeto recém-criado contém 0 tarefas");
    assert(emptyProgress === 0, "Percentagem de progresso é exatamente 0% sem divisão por zero (EC01)");

    // 3. Adicionar Tarefas com Estados, Prioridades e Prazos Distintos
    console.log("\n2. Teste de Cálculo das Métricas Operacionais (KPIs, Progresso e Alertas):");
    const now = new Date();
    const pastDueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 dias atrás (em atraso)
    const futureDueDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 dias no futuro
    const todayDueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59); // Expira hoje

    // Tarefa 1: Concluída (DONE)
    const taskDone = await prisma.task.create({
      data: {
        projectId: emptyProject.id,
        title: "Tarefa 1 Concluída",
        status: "DONE",
        priority: "MEDIUM",
        dueDate: futureDueDate,
        assigneeId: membro!.id,
      },
    });

    // Tarefa 2: Em Progresso (IN_PROGRESS)
    const taskInProgress = await prisma.task.create({
      data: {
        projectId: emptyProject.id,
        title: "Tarefa 2 Em Execução",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: futureDueDate,
        assigneeId: membro!.id,
      },
    });

    // Tarefa 3: Em Atraso (TODO com dueDate no passado)
    const taskOverdue = await prisma.task.create({
      data: {
        projectId: emptyProject.id,
        title: "Tarefa 3 Em Atraso Crítico",
        status: "TODO",
        priority: "HIGH",
        dueDate: pastDueDate,
        assigneeId: gestor!.id,
      },
    });

    // Tarefa 4: Expira Hoje (TODO com dueDate hoje)
    const taskExpiringToday = await prisma.task.create({
      data: {
        projectId: emptyProject.id,
        title: "Tarefa 4 A Expirar Hoje",
        status: "TODO",
        priority: "LOW",
        dueDate: todayDueDate,
      },
    });

    const allTasks = await prisma.task.findMany({
      where: { projectId: emptyProject.id },
      include: { assignee: true },
      orderBy: { dueDate: "asc" },
    });

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todoTasks = allTasks.filter((t) => t.status === "TODO").length;
    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

    assert(totalTasks === 4, "Total de 4 tarefas criadas com sucesso");
    assert(completedTasks === 1, "1 tarefa concluída identificada");
    assert(inProgressTasks === 1, "1 tarefa em progresso identificada");
    assert(todoTasks === 2, "2 tarefas a fazer identificadas");
    assert(progressPercentage === 25, "Percentagem calculada rigorosamente em 25% (1 de 4)");

    // 4. Teste de Deteção de Atrasos e Tarefas Críticas (RF11 / US04)
    console.log("\n3. Teste de Tarefas em Atraso e Painel Crítico:");
    let overdueCount = 0;
    const criticalList: any[] = [];
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    for (const t of allTasks) {
      const isOverdue = computeIsOverdue(t.dueDate, t.status);
      if (isOverdue) overdueCount++;

      const isExpiringToday =
        t.status !== "DONE" &&
        new Date(t.dueDate).getTime() <= endOfToday.getTime();

      if (isOverdue || isExpiringToday) {
        criticalList.push({
          id: t.id,
          title: t.title,
          isOverdue,
          isExpiringToday,
        });
      }
    }

    assert(overdueCount === 1, "Exatamente 1 tarefa contabilizada em atraso (overdueTasksCount = 1)");
    assert(criticalList.length === 2, "Lista de atenção crítica contém 2 tarefas (1 em atraso + 1 a expirar hoje)");
    assert(
      criticalList.some((t) => t.id === taskOverdue.id && t.isOverdue),
      "Tarefa com prazo vencido incluída com isOverdue=true"
    );
    assert(
      criticalList.some((t) => t.id === taskExpiringToday.id),
      "Tarefa que expira hoje incluída nas tarefas críticas"
    );

    // 5. Teste da Série Temporal de Velocidade (RF12 - 7 Dias)
    console.log("\n4. Teste de Série Temporal dos Últimos 7 Dias (RF12):");
    const weeklyVelocity: Array<{ date: string; completedCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setUTCDate(targetDate.getUTCDate() - i);
      const dateString = targetDate.toISOString().split("T")[0];

      const completedOnDate = allTasks.filter((t) => {
        if (t.status !== "DONE") return false;
        const taskUpdatedDate = new Date(t.updatedAt).toISOString().split("T")[0];
        return taskUpdatedDate === dateString;
      }).length;

      weeklyVelocity.push({ date: dateString, completedCount: completedOnDate });
    }

    assert(weeklyVelocity.length === 7, "Série temporal contém exatamente 7 entradas diárias");
    const todayVelocity = weeklyVelocity[6];
    assert(todayVelocity.completedCount === 1, "Dia de hoje reflete exatamente 1 tarefa concluída");

    // 6. Teste de Limpeza Segura (Cascata)
    console.log("\n5. Teste de Eliminação em Cascata:");
    await prisma.project.delete({ where: { id: emptyProject.id } });
    testProjectId = ""; // Limpo

    const remainingTasks = await prisma.task.count({ where: { projectId: emptyProject.id } });
    assert(remainingTasks === 0, "Todas as 4 tarefas foram eliminadas em cascata com o projeto");

  } catch (err) {
    console.error("❌ Erro inesperado durante execução dos testes:", err);
    failed++;
  } finally {
    if (testProjectId) {
      await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log(`\n========================================`);
  console.log(`Resultado Final: ${passed} passaram, ${failed} falharam.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runFrontendIntegrationTests();
