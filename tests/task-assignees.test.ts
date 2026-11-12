import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTaskAssigneesTests() {
  console.log("🧪 A iniciar suite de testes de Múltiplos Responsáveis (N:M, Prevenção de Duplicados, Remoção e Persistência na Reabertura)...\n");
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

  try {
    const gestor = await prisma.user.findUnique({ where: { email: "luis.ferreira@matriz.local" } });
    const membro1 = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });
    const membro2 = await prisma.user.findUnique({ where: { email: "carlos.ramos@matriz.local" } });

    assert(Boolean(gestor) && Boolean(membro1) && Boolean(membro2), "3 utilizadores de teste elegíveis disponíveis na base de dados");

    // 1. Criar projeto e tarefa de suporte
    console.log("\n1. Preparação de Tarefa de Suporte:");
    const testProject = await prisma.project.create({
      data: {
        title: `Projeto Teste Atribuições ${Date.now()}`,
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-11-30"),
        managerId: gestor!.id,
      },
    });

    const testTask = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: "Tarefa com Múltiplos Responsáveis",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date("2026-11-20"),
      },
    });

    assert(Boolean(testTask.id), "Tarefa de suporte criada com sucesso");

    // 2. Associar Múltiplos Responsáveis à mesma tarefa
    console.log("\n2. Teste de Associação de Múltiplos Responsáveis à mesma Tarefa (N:M):");
    const assign1 = await prisma.taskAssignment.create({
      data: {
        taskId: testTask.id,
        userId: gestor!.id,
      },
      include: { user: true },
    });
    assert(assign1.userId === gestor!.id, "Primeiro responsável (Gestor) associado com sucesso");

    const assign2 = await prisma.taskAssignment.create({
      data: {
        taskId: testTask.id,
        userId: membro1!.id,
      },
      include: { user: true },
    });
    assert(assign2.userId === membro1!.id, "Segundo responsável (Membro Ana) associado à mesma tarefa com sucesso");

    const assign3 = await prisma.taskAssignment.create({
      data: {
        taskId: testTask.id,
        userId: membro2!.id,
      },
      include: { user: true },
    });
    assert(assign3.userId === membro2!.id, "Terceiro responsável (Membro Carlos) associado à mesma tarefa com sucesso");

    const totalAssignees = await prisma.taskAssignment.count({ where: { taskId: testTask.id } });
    assert(totalAssignees === 3, "Total de 3 responsáveis distintos associados à mesma tarefa");

    // 3. Impedir a Repetição da Associação (Prevenção de Duplicados)
    console.log("\n3. Teste de Prevenção de Duplicados (Impedir Repetição da mesma Associação):");
    let duplicatePrevented = false;
    try {
      await prisma.taskAssignment.create({
        data: {
          taskId: testTask.id,
          userId: gestor!.id, // Já associado anteriormente!
        },
      });
    } catch (err: any) {
      // Prisma P2002: Unique constraint failed
      if (err.code === "P2002" || err.message?.includes("Unique constraint")) {
        duplicatePrevented = true;
      }
    }
    assert(duplicatePrevented, "Tentativa de associar o mesmo utilizador à mesma tarefa foi bloqueada pela restrição @@unique([taskId, userId])");

    // 4. Remoção de Atribuição Individual
    console.log("\n4. Teste de Remoção de Cada Atribuição Individualmente:");
    await prisma.taskAssignment.delete({
      where: {
        taskId_userId: {
          taskId: testTask.id,
          userId: membro2!.id,
        },
      },
    });

    const assigneesAfterRemoval = await prisma.taskAssignment.count({ where: { taskId: testTask.id } });
    assert(assigneesAfterRemoval === 2, "Atribuição do Membro Carlos removida com sucesso (restando 2 responsáveis)");

    const carlosStillAssigned = await prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: {
          taskId: testTask.id,
          userId: membro2!.id,
        },
      },
    });
    assert(carlosStillAssigned === null, "Membro Carlos já não consta como responsável da tarefa");

    // 5. Persistência dos Responsáveis após Reabrir a Tarefa (TODO -> DONE -> IN_PROGRESS)
    console.log("\n5. Teste de Persistência das Atribuições após Reabertura da Tarefa:");
    // Concluir a tarefa
    await prisma.task.update({
      where: { id: testTask.id },
      data: { status: "DONE" },
    });

    // Reabrir a tarefa
    await prisma.task.update({
      where: { id: testTask.id },
      data: { status: "IN_PROGRESS" },
    });

    const taskReopened = await prisma.task.findUnique({
      where: { id: testTask.id },
      include: {
        assignments: {
          include: { user: true },
        },
      },
    });

    assert(taskReopened?.status === "IN_PROGRESS", "Tarefa reaberta com sucesso no estado IN_PROGRESS");
    assert(taskReopened?.assignments.length === 2, "As atribuições de responsáveis permaneceram intactas após a reabertura da tarefa");

    // 6. Limpeza Segura
    await prisma.project.delete({ where: { id: testProject.id } });
    const assignmentsRemaining = await prisma.taskAssignment.count({ where: { taskId: testTask.id } });
    assert(assignmentsRemaining === 0, "Atribuições limpas em cascata após eliminação do projeto pai (sem órfãos)");

  } catch (error) {
    console.error("Erro inesperado durante a execução dos testes:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n========================================");
  console.log(`Resultados dos Testes: ${passed} Passaram, ${failed} Falharam`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTaskAssigneesTests();
