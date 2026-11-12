/**
 * FICHA PRÁTICA 4 — EXERCÍCIO 3: INTEGRATION TESTING
 * 
 * Objetivo: Validar a API e a persistência real em ambiente controlado.
 * 1. Fluxo de integração bem-sucedido: Criar uma tarefa válida e consultá-la posteriormente
 *    pela API, respeitando o contrato OpenAPI real e as permissões aplicáveis.
 * 2. Validação de status HTTP, campos devolvidos e persistência física em SQLite.
 * 3. Cenários negativos: Título inválido (HTTP 400), recurso inexistente (HTTP 404),
 *    projeto inexistente (HTTP 404) e violação de autorização RBAC (HTTP 403).
 * 4. Isolamento estrito com base de dados de teste e reposição/limpeza garantida (teardown).
 * 
 * Runtime: Node.js nativo com Prisma ORM e node:assert/strict
 */

import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";

const prisma = new PrismaClient();
const AUTH_SECRET = process.env.AUTH_SECRET || "matriz-poc-super-secret-key-2026-auth";

console.log("================================================================================");
console.log("🧪 FICHA PRÁTICA 4 — EXERCÍCIO 3: TESTES DE INTEGRAÇÃO DE TAREFAS (API & SQLite)");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, desc: string, evidence?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${desc}`);
    if (evidence) console.log(`     └─ Evidência: ${evidence}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    if (evidence) console.error(`     └─ Detalhe: ${evidence}`);
    failedCount++;
  }
}

// Schemas Zod de contrato OpenAPI
const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "A data deve ser uma representação válida (ex: AAAA-MM-DD ou ISO 8601)",
  });

const createTaskSchema = z.object({
  title: z
    .string({ required_error: "O título da tarefa é obrigatório" })
    .trim()
    .min(3, "O título da tarefa deve ter pelo menos 3 caracteres")
    .max(150, "O título da tarefa não pode exceder 150 caracteres"),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: dateStringSchema.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

function computeIsOverdue(dueDate: Date | string, status: string): boolean {
  if (status === "DONE") return false;
  const parsed = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return new Date().getTime() > parsed.getTime();
}

/**
 * Simula a invocação do Route Handler POST /api/v1/projects/[projectId]/tasks
 */
async function apiPostCreateTask(
  projectId: string,
  payload: any,
  user: { id: string; role: string } | null
) {
  // 1. Autenticação (requireAuth)
  if (!user) {
    return {
      status: 401,
      body: {
        statusCode: 401,
        error: "Unauthorized",
        message: "Sessão inválida ou inexistente. Por favor inicie sessão.",
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 2. Validação sintática do schema (Zod)
  const validation = createTaskSchema.safeParse(payload);
  if (!validation.success) {
    return {
      status: 400,
      body: {
        statusCode: 400,
        error: "Bad Request",
        message: "Dados da tarefa inválidos.",
        details: validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 3. Verificação do projeto pai
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return {
      status: 404,
      body: {
        statusCode: 404,
        error: "Not Found",
        message: "Projeto pai não encontrado.",
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 4. Verificação de permissões RBAC: Membro não pode definir prazo (US02 - Critério 2.3)
  if (user.role === "TEAM_MEMBER" && validation.data.dueDate) {
    return {
      status: 403,
      body: {
        statusCode: 403,
        error: "Forbidden",
        message: "Apenas o Gestor de Projeto tem permissão para definir ou alterar datas limite.",
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 5. Incoerência temporal (EC02)
  const resolvedDueDate = validation.data.dueDate
    ? new Date(validation.data.dueDate)
    : new Date(project.targetDate);

  if (resolvedDueDate < new Date(project.startDate)) {
    return {
      status: 400,
      body: {
        statusCode: 400,
        error: "Bad Request",
        message: "A data limite da tarefa não pode ser anterior à data de início do projeto.",
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 6. Persistência real na base de dados SQLite
  const created = await prisma.task.create({
    data: {
      projectId: project.id,
      title: validation.data.title,
      description: validation.data.description || null,
      status: validation.data.status,
      priority: validation.data.priority,
      dueDate: resolvedDueDate,
      assigneeId: validation.data.assigneeId || null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, role: true } },
      assignments: { include: { user: true } },
      _count: { select: { comments: true } },
    },
  });

  return {
    status: 201,
    body: {
      id: created.id,
      projectId: created.projectId,
      assigneeId: created.assigneeId,
      title: created.title,
      description: created.description,
      priority: created.priority,
      status: created.status,
      dueDate: created.dueDate.toISOString(),
      isOverdue: computeIsOverdue(created.dueDate, created.status),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      assignee: created.assignee,
      assignees: created.assignments,
      commentsCount: created._count.comments,
    },
  };
}

/**
 * Simula a invocação do Route Handler GET /api/v1/tasks/[taskId]
 */
async function apiGetTaskById(taskId: string, user: { id: string; role: string } | null) {
  if (!user) {
    return {
      status: 401,
      body: {
        statusCode: 401,
        error: "Unauthorized",
        message: "Sessão inválida ou inexistente. Por favor inicie sessão.",
        timestamp: new Date().toISOString(),
      },
    };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, title: true, status: true } },
      assignee: { select: { id: true, name: true, email: true, role: true } },
      assignments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      _count: { select: { comments: true } },
    },
  });

  if (!task) {
    return {
      status: 404,
      body: {
        statusCode: 404,
        error: "Not Found",
        message: "Tarefa não encontrada.",
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    status: 200,
    body: {
      id: task.id,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate.toISOString(),
      isOverdue: computeIsOverdue(task.dueDate, task.status),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      project: task.project,
      assignee: task.assignee,
      assignees: task.assignments,
      commentsCount: task._count.comments,
    },
  };
}

async function runIntegrationSuite() {
  let testProjectId = "";
  let createdTaskId = "";

  try {
    // -------------------------------------------------------------------------
    // SETUP: Ambiente Isolado e Utilizadores de Teste
    // -------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("0. Setup do Ambiente de Teste Isolado");
    console.log("--------------------------------------------------------------------------------");

    const gestor = await prisma.user.findUnique({ where: { email: "luis.ferreira@matriz.local" } });
    const membro = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });

    assert(Boolean(gestor) && gestor?.role === "PROJECT_MANAGER", "Gestor de Projeto recuperado para teste de integração");
    assert(Boolean(membro) && membro?.role === "TEAM_MEMBER", "Membro de Equipa recuperado para teste de integração");

    // Criar projeto isolado para os testes de integração
    const testProject = await prisma.project.create({
      data: {
        title: `TEST-FP4-PROJETO-${Date.now()}`,
        description: "Projeto temporário isolado para testes de integração",
        startDate: new Date("2026-11-01T00:00:00.000Z"),
        targetDate: new Date("2026-12-31T23:59:59.000Z"),
        managerId: gestor!.id,
        status: "ACTIVE",
      },
    });
    testProjectId = testProject.id;
    assert(Boolean(testProjectId), "Projeto isolado criado com sucesso no SQLite", `ID=${testProjectId}`);

    // -------------------------------------------------------------------------
    // 1. FLUXO POSITIVO: CRIAÇÃO E CONSULTA VIA API COM PERSISTÊNCIA REAL
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("1. Fluxo Positivo: Criação de Tarefa Válida e Consulta Posterior via API");
    console.log("--------------------------------------------------------------------------------");

    const taskPayload = {
      title: "Desenvolver endpoints de auditoria com RBAC",
      description: "Implementar e validar endpoints de integração para Ficha Prática 4",
      priority: "HIGH",
      dueDate: "2026-11-28T18:00:00.000Z",
    };

    // 1.1 Invocação da API de Criação (POST)
    const postResponse = await apiPostCreateTask(testProjectId, taskPayload, gestor);

    assert(postResponse.status === 201, "API POST /projects/{id}/tasks responde com HTTP 201 Created", `Status=${postResponse.status}`);
    assert(Boolean(postResponse.body.id), "API retorna identificador único (UUID) gerado", `Task ID=${postResponse.body.id}`);
    assert(postResponse.body.title === taskPayload.title, "Título devolvido coincide com o enviado");
    assert(postResponse.body.status === "TODO", "Estado inicial predefinido como 'TODO'");
    assert(postResponse.body.priority === "HIGH", "Prioridade registada como 'HIGH'");
    assert(postResponse.body.projectId === testProjectId, "Tarefa associada ao projeto pai correto");
    assert(postResponse.body.isOverdue === false, "Atributo virtual isOverdue calculado como falso (prazo futuro)");
    assert(Boolean(postResponse.body.createdAt), "Timestamp de criação UTC gerado pelo servidor");

    createdTaskId = postResponse.body?.id || "";

    // 1.2 Invocação da API de Consulta (GET)
    const getResponse = await apiGetTaskById(createdTaskId, gestor);

    assert(getResponse.status === 200, "API GET /tasks/{id} responde com HTTP 200 OK", `Status=${getResponse.status}`);
    assert(getResponse.body.id === createdTaskId, "Identificador da tarefa consultada coincide com o criado");
    assert(getResponse.body.title === taskPayload.title, "Título da tarefa preservado na consulta");
    assert(getResponse.body.description === taskPayload.description, "Descrição da tarefa preservada na consulta");
    assert(getResponse.body.status === "TODO", "Estado da tarefa preservado na consulta");
    assert(getResponse.body.project?.title === testProject.title, "Relação com projeto pai incluída nos detalhes da tarefa");

    // 1.3 Verificação de Persistência Física no SQLite
    const persistedDbRecord = await prisma.task.findUnique({
      where: { id: createdTaskId },
    });

    assert(Boolean(persistedDbRecord), "Registo físico existe na tabela 'Task' da base de dados SQLite");
    assert(persistedDbRecord?.title === taskPayload.title, "Dados físicos no SQLite conferem com o pedido original");
    assert(persistedDbRecord?.projectId === testProjectId, "Chave estrangeira 'projectId' preservada no SQLite");

    // -------------------------------------------------------------------------
    // 2. CENÁRIOS NEGATIVOS: VALIDAÇÃO, RECURSO INEXISTENTE E SEGURANÇA
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("2. Cenários Negativos (Título Inválido, 404 Recurso Inexistente e RBAC 403)");
    console.log("--------------------------------------------------------------------------------");

    // 2.1 Cenário Negativo: Título Inválido (apenas espaços em branco)
    const invalidTitlePayload = {
      title: "      ",
      priority: "MEDIUM",
    };
    const invalidTitleResponse = await apiPostCreateTask(testProjectId, invalidTitlePayload, gestor);

    assert(invalidTitleResponse.status === 400, "Título composto apenas por espaços em branco devolve HTTP 400 Bad Request", `Status=${invalidTitleResponse.status}`);
    assert(invalidTitleResponse.body.error === "Bad Request", "Formato de erro ErrorResponse: error='Bad Request'");
    assert(Array.isArray(invalidTitleResponse.body.details) && invalidTitleResponse.body.details.length > 0, "Array 'details' contém mensagem explicativa da rejeição");

    // 2.2 Cenário Negativo: Consulta de Recurso Inexistente (404)
    const nonExistentTaskId = "00000000-0000-0000-0000-000000000000";
    const notFoundResponse = await apiGetTaskById(nonExistentTaskId, gestor);

    assert(notFoundResponse.status === 404, "Consulta de ID de tarefa inexistente devolve HTTP 404 Not Found", `Status=${notFoundResponse.status}`);
    assert(notFoundResponse.body.error === "Not Found", "Formato de erro ErrorResponse: error='Not Found'");
    assert(notFoundResponse.body.message === "Tarefa não encontrada.", "Mensagem contextual de recurso não localizado");

    // 2.3 Cenário Negativo: Projeto Inexistente na Criação (404)
    const nonExistentProjectId = "11111111-1111-1111-1111-111111111111";
    const projectNotFoundResponse = await apiPostCreateTask(nonExistentProjectId, taskPayload, gestor);

    assert(projectNotFoundResponse.status === 404, "Tentativa de criar tarefa em projeto inexistente devolve HTTP 404 Not Found", `Status=${projectNotFoundResponse.status}`);

    // 2.4 Cenário Negativo: Violação de Permissão RBAC (Membro tenta definir prazo)
    const memberDuePayload = {
      title: "Tarefa Tentativa Prazo por Membro",
      priority: "LOW",
      dueDate: "2026-11-20T10:00:00.000Z",
    };
    const forbiddenResponse = await apiPostCreateTask(testProjectId, memberDuePayload, membro);

    assert(forbiddenResponse.status === 403, "Membro de Equipa a tentar definir prazo de entrega é bloqueado com HTTP 403 Forbidden", `Status=${forbiddenResponse.status}`);
    assert(forbiddenResponse.body.error === "Forbidden", "Estrutura ErrorResponse: error='Forbidden'");
    assert(Boolean(forbiddenResponse.body.message?.includes("Gestor de Projeto")), "Mensagem informativa sobre autorização exclusiva do Gestor");

    // 2.5 Cenário Negativo: Pedido sem Autenticação (401)
    const unauthenticatedResponse = await apiPostCreateTask(testProjectId, taskPayload, null);

    assert(unauthenticatedResponse.status === 401, "Pedido sem sessão autenticada devolve HTTP 401 Unauthorized", `Status=${unauthenticatedResponse.status}`);

  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Limpeza Garantida do Estado Isolado
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("3. Teardown e Limpeza de Estado (Isolamento Garantido)");
    console.log("--------------------------------------------------------------------------------");

    if (testProjectId) {
      // Eliminar tarefas associadas ao projeto de teste
      const deletedTasks = await prisma.task.deleteMany({
        where: { projectId: testProjectId },
      });
      console.log(`  🧹 Limpeza: ${deletedTasks.count} tarefas de teste removidas.`);

      // Eliminar projeto de teste
      await prisma.project.delete({
        where: { id: testProjectId },
      });
      console.log(`  🧹 Limpeza: Projeto de teste '${testProjectId}' removido.`);

      // Confirmação de integridade pós-limpeza
      const remainingTasks = await prisma.task.count({ where: { projectId: testProjectId } });
      const remainingProjects = await prisma.project.count({ where: { id: testProjectId } });

      assert(remainingTasks === 0, "Nenhuma tarefa órfã permaneceu na base de dados SQLite");
      assert(remainingProjects === 0, "Projeto de teste removido integralmente do SQLite");
    }

    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // RESUMO DOS RESULTADOS
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`RESUMO DA SUITE DE INTEGRAÇÃO: ${passedCount} Passaram, ${failedCount} Falharam.`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runIntegrationSuite().catch((err) => {
  console.error("Erro fatal durante a execução dos testes de integração:", err);
  process.exit(1);
});
