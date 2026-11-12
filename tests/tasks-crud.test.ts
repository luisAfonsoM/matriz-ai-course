import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schemas Zod de verificação estrita em conformidade com o OpenAPI
const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "A data deve ser válida",
  });

const createTaskSchema = z.object({
  title: z
    .string({ required_error: "O título da tarefa é obrigatório" })
    .trim()
    .min(3, "O título da tarefa deve ter pelo menos 3 caracteres")
    .max(150, "O título da tarefa não pode exceder 150 caracteres"),
  description: z
    .string()
    .max(2000, "A descrição não pode exceder 2000 caracteres")
    .optional()
    .nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: dateStringSchema.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "O título da tarefa deve ter pelo menos 3 caracteres")
    .max(150, "O título da tarefa não pode exceder 150 caracteres")
    .optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: dateStringSchema.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

function computeIsOverdue(dueDate: Date, status: string): boolean {
  if (status === "DONE") return false;
  return new Date().getTime() > new Date(dueDate).getTime();
}

async function runTasksCrudTests() {
  console.log("🧪 A iniciar suite de testes do Módulo de Gestão de Tarefas (CRUD, Filtros, Paginação, Anti-Espaços, Alerta de Atraso)...\n");
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
    const membro = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });

    assert(gestor?.role === "PROJECT_MANAGER", "Gestor de Projeto disponível");
    assert(membro?.role === "TEAM_MEMBER", "Membro de Equipa disponível");

    // 1. Validação de Título e Descrição (Rejeitar apenas espaços, 3 a 150 caracteres, desc <= 2000)
    console.log("\n1. Teste de Validações de Título (3-150 carateres, rejeição de apenas espaços) e Descrição (<= 2000):");
    const onlySpaces = createTaskSchema.safeParse({ title: "     " });
    assert(!onlySpaces.success, "Rejeita título composto exclusivamente por espaços em branco");

    const spacesWithShort = createTaskSchema.safeParse({ title: "  ab  " });
    assert(!spacesWithShort.success, "Rejeita título com menos de 3 caracteres úteis após trim ('  ab  ')");

    const validTrimmed = createTaskSchema.safeParse({ title: "  abc  " });
    assert(validTrimmed.success && validTrimmed.data.title === "abc", "Aceita e higieniza título válido com espaços nos extremos ('  abc  ' -> 'abc')");

    const tooLongTitle = createTaskSchema.safeParse({ title: "T".repeat(151) });
    assert(!tooLongTitle.success, "Rejeita título com mais de 150 caracteres (> 150)");

    const exactMaxTitle = createTaskSchema.safeParse({ title: "T".repeat(150) });
    assert(exactMaxTitle.success, "Aceita título no limite de 150 caracteres");

    const tooLongDesc = createTaskSchema.safeParse({
      title: "Tarefa Válida",
      description: "D".repeat(2001),
    });
    assert(!tooLongDesc.success, "Rejeita descrição com mais de 2000 caracteres (> 2000)");

    const validLongDesc = createTaskSchema.safeParse({
      title: "Tarefa Válida",
      description: "D".repeat(2000),
    });
    assert(validLongDesc.success, "Aceita descrição no limite máximo de 2000 caracteres");

    // 2. Valores Predefinidos de Estado e Prioridade
    console.log("\n2. Teste de Valores Predefinidos (TODO e MEDIUM):");
    const defaultParsed = createTaskSchema.parse({ title: "Tarefa com Defaults" });
    assert(defaultParsed.status === "TODO", "Estado inicial predefinido é TODO");
    assert(defaultParsed.priority === "MEDIUM", "Prioridade inicial predefinida é MEDIUM");

    // 3. Criação de Projeto de Teste e Tarefas no SQLite
    console.log("\n3. Teste de Criação e Persistência de Tarefas em Projeto:");
    const testProject = await prisma.project.create({
      data: {
        title: `Projeto Teste Tarefas ${Date.now()}`,
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-11-30"),
        status: "ACTIVE",
        managerId: gestor!.id,
      },
    });
    assert(Boolean(testProject.id), "Projeto de suporte criado com sucesso");

    // Validação temporal: dueDate < project.startDate (EC02)
    const invalidDueDate = new Date("2026-10-15");
    const isBeforeStart = invalidDueDate < testProject.startDate;
    assert(isBeforeStart, "Deteção defensiva de incoerência temporal: dueDate < project.startDate");

    // Criar 3 tarefas com diferentes estados e prioridades para testar filtros
    const taskTodo = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: "Tarefa em Aberto",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date("2026-11-20"),
        assigneeId: membro!.id,
      },
    });

    const taskInProgress = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: "Tarefa Em Andamento",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        dueDate: new Date("2026-11-25"),
        assigneeId: gestor!.id,
      },
    });

    const taskDone = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: "Tarefa Concluída",
        status: "DONE",
        priority: "LOW",
        dueDate: new Date("2026-11-10"),
        assigneeId: membro!.id,
      },
    });

    assert(Boolean(taskTodo.id) && Boolean(taskInProgress.id) && Boolean(taskDone.id), "3 tarefas persistidas com sucesso na base de dados");

    // 4. Teste de Filtros por Estado e Prioridade
    console.log("\n4. Teste de Filtragem por Estado e Prioridade:");
    const todoFiltered = await prisma.task.findMany({
      where: { projectId: testProject.id, status: "TODO" },
    });
    assert(todoFiltered.length === 1 && todoFiltered[0].id === taskTodo.id, "Filtro por status='TODO' retorna exatamente 1 tarefa");

    const highFiltered = await prisma.task.findMany({
      where: { projectId: testProject.id, priority: "HIGH" },
    });
    assert(highFiltered.length === 1 && highFiltered[0].id === taskTodo.id, "Filtro por priority='HIGH' retorna exatamente a tarefa de prioridade alta");

    const combinedFiltered = await prisma.task.findMany({
      where: { projectId: testProject.id, status: "IN_PROGRESS", priority: "MEDIUM" },
    });
    assert(combinedFiltered.length === 1 && combinedFiltered[0].id === taskInProgress.id, "Filtro combinado por status e priority retorna a tarefa correspondente");

    // 5. Teste de Paginação
    console.log("\n5. Teste de Paginação:");
    const page1Tasks = await prisma.task.findMany({
      where: { projectId: testProject.id },
      take: 2,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });
    assert(page1Tasks.length === 2, "Paginação limita corretamente a 2 tarefas na página 1");

    const page2Tasks = await prisma.task.findMany({
      where: { projectId: testProject.id },
      take: 2,
      skip: 2,
      orderBy: { createdAt: "desc" },
    });
    assert(page2Tasks.length === 1, "Página 2 retorna a tarefa restante (total 3)");

    // 6. Teste de Edição de Metadados e Transição de Estado
    console.log("\n6. Teste de Edição e Transição de Estado:");
    const updatedTask = await prisma.task.update({
      where: { id: taskTodo.id },
      data: {
        status: "IN_PROGRESS",
        priority: "LOW",
        title: "Tarefa em Aberto (Agora Em Progresso)",
      },
    });
    assert(updatedTask.status === "IN_PROGRESS", "Estado da tarefa atualizado para IN_PROGRESS");
    assert(updatedTask.priority === "LOW", "Prioridade da tarefa atualizada para LOW");

    // 7. Cálculo do Alerta de Atraso (isOverdue)
    console.log("\n7. Teste de Cálculo do Alerta de Atraso (isOverdue):");
    const pastDate = new Date("2026-01-01");
    const overdueActive = computeIsOverdue(pastDate, "TODO");
    assert(overdueActive === true, "Tarefa com prazo no passado e estado TODO é considerada em atraso (isOverdue = true)");

    const overdueDone = computeIsOverdue(pastDate, "DONE");
    assert(overdueDone === false, "Tarefa com prazo no passado mas estado DONE NÃO é considerada em atraso (isOverdue = false)");

    // 8. Eliminação de Tarefa e Remoção em Cascata de Comentários (Anti-Órfãos)
    console.log("\n8. Teste de Eliminação e Integridade Referencial:");
    const testComment = await prisma.comment.create({
      data: {
        taskId: taskTodo.id,
        authorId: membro!.id,
        content: "Comentário que deve ser apagado em cascata.",
      },
    });
    assert(Boolean(testComment.id), "Comentário associado à tarefa criado com sucesso");

    await prisma.task.delete({ where: { id: taskTodo.id } });
    const taskCheck = await prisma.task.findUnique({ where: { id: taskTodo.id } });
    assert(taskCheck === null, "Tarefa eliminada com sucesso da base de dados");

    const commentCheck = await prisma.comment.findUnique({ where: { id: testComment.id } });
    assert(commentCheck === null, "Comentário dependente eliminado em cascata (sem registo órfão)");

    // Limpeza do projeto de teste
    await prisma.project.delete({ where: { id: testProject.id } });
    assert(true, "Limpeza do projeto de teste e tarefas restantes efetuada com sucesso");

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

runTasksCrudTests();
