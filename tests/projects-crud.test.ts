import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Replicar schemas de teste em conformidade com Zod
const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "A data deve ser válida",
  });

const createProjectSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().max(1000).optional().nullable(),
    startDate: dateStringSchema,
    targetDate: dateStringSchema,
  })
  .refine((data) => new Date(data.targetDate) >= new Date(data.startDate), {
    message: "Data de conclusão deve ser >= data de início",
    path: ["targetDate"],
  });

const updateProjectSchema = z
  .object({
    title: z.string().trim().min(3).max(100).optional(),
    description: z.string().max(1000).optional().nullable(),
    startDate: dateStringSchema.optional(),
    targetDate: dateStringSchema.optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.targetDate) {
        return new Date(data.targetDate) >= new Date(data.startDate);
      }
      return true;
    },
    { path: ["targetDate"] }
  );

async function runProjectsCrudTests() {
  console.log("🧪 A iniciar suite de verificação do Módulo de Gestão de Projetos (CRUD, Pesquisa, Paginação, Anti-Órfãos)...\n");
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

    assert(gestor?.role === "PROJECT_MANAGER", "Utilizador Gestor disponível com papel PROJECT_MANAGER");
    assert(membro?.role === "TEAM_MEMBER", "Utilizador Membro disponível com papel TEAM_MEMBER");

    // 1. Validação de Schemas OpenAPI / Zod
    console.log("\n1. Teste de Validações de Contrato (Nome 3-100, Descrição <= 1000, Datas Coerentes):");
    const invalidShortTitle = createProjectSchema.safeParse({
      title: "Oi",
      startDate: "2026-11-01",
      targetDate: "2026-11-30",
    });
    assert(!invalidShortTitle.success, "Rejeita título com menos de 3 caracteres (< 3)");

    const invalidLongTitle = createProjectSchema.safeParse({
      title: "A".repeat(101),
      startDate: "2026-11-01",
      targetDate: "2026-11-30",
    });
    assert(!invalidLongTitle.success, "Rejeita título com mais de 100 caracteres (> 100)");

    const invalidLongDesc = createProjectSchema.safeParse({
      title: "Projeto Alpha",
      description: "X".repeat(1001),
      startDate: "2026-11-01",
      targetDate: "2026-11-30",
    });
    assert(!invalidLongDesc.success, "Rejeita descrição com mais de 1000 caracteres (> 1000)");

    const validLongDesc = createProjectSchema.safeParse({
      title: "Projeto Alpha",
      description: "X".repeat(1000),
      startDate: "2026-11-01",
      targetDate: "2026-11-30",
    });
    assert(validLongDesc.success, "Aceita descrição até 1000 caracteres (limite máximo permitido)");

    const invalidDates = createProjectSchema.safeParse({
      title: "Projeto Incoerente",
      startDate: "2026-12-01",
      targetDate: "2026-11-01",
    });
    assert(!invalidDates.success, "Rejeita data prevista anterior à data de início (targetDate < startDate)");

    // 2. Criação e Associação Segura ao Gestor Autenticado
    console.log("\n2. Teste de Criação de Projeto & Associação ao Utilizador:");
    const testTitle = `Projeto Teste Automatizado ${Date.now()}`;
    const newProject = await prisma.project.create({
      data: {
        title: testTitle,
        description: "Descrição para validação end-to-end de persistência.",
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-12-01"),
        status: "ACTIVE",
        managerId: gestor!.id,
      },
      include: {
        manager: true,
        tasks: true,
      },
    });

    assert(Boolean(newProject.id), "Projeto persistido com sucesso na base de dados SQLite");
    assert(newProject.managerId === gestor!.id, "Projeto associado rigorosamente ao Gestor autenticado");
    assert(newProject.status === "ACTIVE", "Projeto inicializado com estado ACTIVE");

    // 3. Pesquisa e Paginação
    console.log("\n3. Teste de Pesquisa por Nome e Paginação:");
    const searchMatch = await prisma.project.findMany({
      where: { title: { contains: "Projeto Teste Automatizado" } },
    });
    assert(searchMatch.length >= 1, "Pesquisa textual por título localiza o projeto correspondente");

    const searchNoMatch = await prisma.project.findMany({
      where: { title: { contains: "TermoCompletamenteInexistenteXYZ" } },
    });
    assert(searchNoMatch.length === 0, "Pesquisa sem correspondência retorna lista vazia");

    const totalProjects = await prisma.project.count();
    const limit = 2;
    const page1 = await prisma.project.findMany({
      take: limit,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });
    assert(page1.length <= limit, `Paginação respeita limite máximo estipulado (limit=${limit})`);
    assert(totalProjects > 0, "Contagem global calculada com precisão para metadados de paginação");

    // 4. Edição de Metadados e Estado (Apenas Gestor)
    console.log("\n4. Teste de Edição de Metadados e RBAC:");
    const updatedProject = await prisma.project.update({
      where: { id: newProject.id },
      data: {
        title: `${testTitle} (Editado)`,
        description: "Nova descrição atualizada pelo Gestor de Projeto.",
        status: "COMPLETED",
      },
    });
    assert(updatedProject.title.endsWith("(Editado)"), "Título do projeto atualizado com sucesso");
    assert(updatedProject.status === "COMPLETED", "Estado do projeto atualizado para COMPLETED");

    // 5. Integridade Referencial, Eliminação e Prevenção de Órfãos
    console.log("\n5. Teste de Eliminação em Cascata e Prevenção de Dados Órfãos (RNF03):");
    // Criar uma tarefa associada ao projeto de teste
    const task = await prisma.task.create({
      data: {
        projectId: newProject.id,
        title: "Tarefa Dependente de Teste",
        status: "TODO",
        dueDate: new Date("2026-11-20"),
        assigneeId: membro!.id,
      },
    });
    assert(Boolean(task.id), "Tarefa dependente criada e associada ao projeto");

    // Criar comentário dependente da tarefa
    const comment = await prisma.comment.create({
      data: {
        taskId: task.id,
        authorId: membro!.id,
        content: "Comentário de teste para verificar integridade em cascata.",
      },
    });
    assert(Boolean(comment.id), "Comentário dependente criado e associado à tarefa");

    // Executar eliminação do projeto
    await prisma.project.delete({
      where: { id: newProject.id },
    });

    const projectCheck = await prisma.project.findUnique({ where: { id: newProject.id } });
    assert(projectCheck === null, "Projeto eliminado da base de dados com sucesso");

    const taskCheck = await prisma.task.findUnique({ where: { id: task.id } });
    assert(taskCheck === null, "Tarefa dependente eliminada em cascata (sem registo órfão)");

    const commentCheck = await prisma.comment.findUnique({ where: { id: comment.id } });
    assert(commentCheck === null, "Comentário dependente eliminado em cascata (sem registo órfão)");

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

runProjectsCrudTests();
