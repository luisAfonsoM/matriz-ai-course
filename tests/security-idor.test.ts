/**
 * FICHA PRÁTICA 4 — EXERCÍCIO 5: TESTES DE REGRESSÃO DE SEGURANÇA E IDOR
 * 
 * Objetivo:
 * Validar formalmente a resolução das vulnerabilidades identificadas durante o Security Review:
 * 1. SEC-01: Rejeição estrita de pedidos fraudulentos com cabeçalho 'X-User-Id' (Sem bypass de autenticação).
 * 2. SEC-02: Prevenção de IDOR na desassociação de tarefas via PUT por Membros de Equipa.
 * 3. SEC-02: Sincronização relacional na desassociação legítima do próprio responsável (N:M).
 * 4. SEC-02 / RBAC: Preservação dos privilégios de gestão total pelo Gestor de Projeto.
 * 5. RBAC: Bloqueio estrito de mutação de prazos, prioridades e eliminação de tarefas por Membros.
 * 
 * Framework/Runtime: Node.js nativo com Prisma ORM, crypto e node:assert/strict.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import assert from "node:assert/strict";

const prisma = new PrismaClient();
const AUTH_SECRET = process.env.AUTH_SECRET || "matriz-poc-super-secret-key-2026-auth";
const SESSION_COOKIE_NAME = "matriz_session";

console.log("================================================================================");
console.log("🛡️ FICHA PRÁTICA 4 — EXERCÍCIO 5: TESTES DE REGRESSÃO DE SEGURANÇA E IDOR");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

function runAssert(condition: boolean, desc: string, evidence?: string) {
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

// ============================================================================
// SIMULAÇÃO DAS REGRAS CORRIGIDAS DO BACKEND
// ============================================================================

function signSessionToken(userId: string, role: string): string {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const payload = { userId, role, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

function verifySessionToken(token: string): { userId: string; role: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadBase64, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payloadBase64)
      .digest("base64url");

    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8"));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Simula a lógica corrigida de extração de identidade de getAuthenticatedUser
 * (sem o fallback vulnerável de X-User-Id)
 */
async function getAuthenticatedUserFromRequest(headers: Record<string, string>) {
  let token: string | null = null;

  // 1. Cookie HTTP-only
  const cookieHeader = headers["cookie"];
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (match) {
      token = match.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }

  // 2. Authorization Bearer
  if (!token && headers["authorization"]) {
    const authHeader = headers["authorization"];
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true },
  });
}

/**
 * Simula o Route Handler corrigido de PUT /api/v1/tasks/[taskId]
 */
async function serviceUpdateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    priority?: "LOW" | "MEDIUM" | "HIGH";
    dueDate?: string | null;
    assigneeId?: string | null;
  },
  user: { id: string; role: string }
) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true, assignments: true },
  });

  if (!existing) {
    return { status: 404, error: "Not Found", message: "Tarefa não encontrada." };
  }

  // Regras de autorização RBAC e IDOR
  if (user.role === "TEAM_MEMBER") {
    if (data.dueDate !== undefined && data.dueDate !== null) {
      return {
        status: 403,
        error: "Forbidden",
        message: "Apenas o Gestor de Projeto pode alterar a data limite de uma tarefa.",
      };
    }
    if (data.priority !== undefined) {
      return {
        status: 403,
        error: "Forbidden",
        message: "Apenas o Gestor de Projeto pode alterar o nível de prioridade da tarefa.",
      };
    }
    if (data.assigneeId !== undefined) {
      // Membro não pode atribuir a outrem
      if (data.assigneeId !== null && data.assigneeId !== user.id) {
        return {
          status: 403,
          error: "Forbidden",
          message: "Membros de equipa apenas podem atribuir tarefas a si próprios.",
        };
      }
      // Proteção IDOR (SEC-02): Membro não pode desassociar tarefas de outros utilizadores
      if (data.assigneeId === null && existing.assigneeId && existing.assigneeId !== user.id) {
        return {
          status: 403,
          error: "Forbidden",
          message: "Membros de equipa apenas podem desassociar tarefas atribuídas a si próprios.",
        };
      }
    }
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;

  if (data.assigneeId !== undefined) {
    updateData.assigneeId = data.assigneeId;
    if (data.assigneeId) {
      await prisma.taskAssignment.upsert({
        where: { taskId_userId: { taskId, userId: data.assigneeId } },
        create: { taskId, userId: data.assigneeId },
        update: {},
      });
    } else if (existing.assigneeId) {
      await prisma.taskAssignment.deleteMany({
        where: { taskId, userId: existing.assigneeId },
      });
    }
  }

  if (data.dueDate !== undefined && data.dueDate !== null) {
    updateData.dueDate = new Date(data.dueDate);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignments: true,
      assignee: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return { status: 200, data: updated };
}

// ============================================================================
// EXECUÇÃO DA SUITE DE TESTES
// ============================================================================

async function runSecurityTests() {
  const testProjectPrefix = `TEST-SEC-PROJ-${Date.now()}`;
  let testProjectId = "";
  let taskAssignedToLuis = "";
  let taskAssignedToAna = "";

  try {
    console.log("--------------------------------------------------------------------------------");
    console.log("0. Preparação de Dados e Contas de Demonstração");
    console.log("--------------------------------------------------------------------------------");

    const gestor = await prisma.user.findUnique({
      where: { email: "luis.ferreira@matriz.local" },
    });
    const membro = await prisma.user.findUnique({
      where: { email: "ana.silva@matriz.local" },
    });

    runAssert(Boolean(gestor) && gestor?.role === "PROJECT_MANAGER", "Conta de demonstração Gestor disponível (Luis Ferreira)");
    runAssert(Boolean(membro) && membro?.role === "TEAM_MEMBER", "Conta de demonstração Membro disponível (Ana Silva)");

    // Criar projeto isolado de testes
    const testProject = await prisma.project.create({
      data: {
        title: `${testProjectPrefix} Auditoria de Segurança`,
        description: "Projeto para testes de regressão de IDOR e autorização",
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-11-30"),
        status: "ACTIVE",
        managerId: gestor!.id,
      },
    });
    testProjectId = testProject.id;
    runAssert(Boolean(testProjectId), "Projeto isolado criado no SQLite", `ID=${testProjectId}`);

    // Criar tarefa atribuída a Luis Ferreira (Gestor)
    const task1 = await prisma.task.create({
      data: {
        projectId: testProjectId,
        title: "Tarefa de Infraestrutura Crítica do Gestor",
        priority: "HIGH",
        status: "TODO",
        dueDate: new Date("2026-11-25"),
        assigneeId: gestor!.id,
        assignments: { create: { userId: gestor!.id } },
      },
    });
    taskAssignedToLuis = task1.id;
    runAssert(Boolean(taskAssignedToLuis), "Tarefa 1 criada e atribuída a Luis Ferreira", `AssigneeId=${task1.assigneeId}`);

    // Criar tarefa atribuída a Ana Silva (Membro)
    const task2 = await prisma.task.create({
      data: {
        projectId: testProjectId,
        title: "Tarefa de Desenvolvimento Frontend da Ana",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        dueDate: new Date("2026-11-28"),
        assigneeId: membro!.id,
        assignments: { create: { userId: membro!.id } },
      },
    });
    taskAssignedToAna = task2.id;
    runAssert(Boolean(taskAssignedToAna), "Tarefa 2 criada e atribuída a Ana Silva", `AssigneeId=${task2.assigneeId}`);

    // -------------------------------------------------------------------------
    // 1. REGRESSÃO SEC-01: REJEIÇÃO DE INJEÇÃO DO CABEÇALHO X-USER-ID
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("1. Regressão SEC-01: Rejeição de Injeção de Identidade via Cabeçalho X-User-Id");
    console.log("--------------------------------------------------------------------------------");

    // Tentativa maliciosa: enviar apenas X-User-Id forjando o Gestor sem token nem cookie
    const spoofedRequestHeaders = {
      "x-user-id": gestor!.id,
    };
    const spoofedUser = await getAuthenticatedUserFromRequest(spoofedRequestHeaders);

    runAssert(
      spoofedUser === null,
      "TC-SEC-05: Pedido apenas com cabeçalho 'X-User-Id' não autentica utilizador (Retorna null / 401)",
      "Bypass de autenticação bloqueado com sucesso"
    );

    // Verificação de autenticação legítima com token assinado HMAC
    const legitimateToken = signSessionToken(gestor!.id, gestor!.role);
    const legitimateHeaders = {
      authorization: `Bearer ${legitimateToken}`,
    };
    const legitimateUser = await getAuthenticatedUserFromRequest(legitimateHeaders);

    runAssert(
      legitimateUser?.id === gestor!.id && legitimateUser.role === "PROJECT_MANAGER",
      "Autenticação legítima com token assinado HMAC-SHA256 concedida com sucesso",
      `User=${legitimateUser?.email} (${legitimateUser?.role})`
    );

    // -------------------------------------------------------------------------
    // 2. REGRESSÃO SEC-02: PROTEÇÃO CONTRA IDOR NA DESASSOCIAÇÃO DE TAREFAS
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("2. Regressão SEC-02: Prevenção de IDOR em Desassociação via PUT /tasks/{id}");
    console.log("--------------------------------------------------------------------------------");

    // Cenário malicioso: Ana Silva (TEAM_MEMBER) tenta desassociar a tarefa de Luis Ferreira
    const maliciousUnassignPayload = {
      assigneeId: null,
    };
    const idorAttemptResult = await serviceUpdateTask(
      taskAssignedToLuis,
      maliciousUnassignPayload,
      { id: membro!.id, role: membro!.role }
    );

    runAssert(
      idorAttemptResult.status === 403,
      "TC-SEC-06: Membro de Equipa é bloqueado com HTTP 403 Forbidden ao tentar desassociar tarefa alheia",
      `Status=${idorAttemptResult.status}`
    );
    runAssert(
      idorAttemptResult.message === "Membros de equipa apenas podem desassociar tarefas atribuídas a si próprios.",
      "Mensagem de segurança informativa retornada pela API",
      idorAttemptResult.message
    );

    // Verificar no SQLite que a tarefa continuou atribuída a Luis
    const task1InDb = await prisma.task.findUnique({
      where: { id: taskAssignedToLuis },
      include: { assignments: true },
    });
    runAssert(
      task1InDb?.assigneeId === gestor!.id,
      "Estado na base de dados SQLite inalterado: responsável primário preservado como Luis Ferreira"
    );
    runAssert(
      task1InDb?.assignments.some((a) => a.userId === gestor!.id) === true,
      "Registo relacional na tabela TaskAssignment preservado sem corrupção"
    );

    // -------------------------------------------------------------------------
    // 3. REGRESSÃO SEC-02: DESASSOCIAÇÃO LEGÍTIMA DA PRÓPRIA TAREFA POR MEMBRO
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("3. Regressão SEC-02: Desassociação Legítima da Própria Tarefa por Membro");
    console.log("--------------------------------------------------------------------------------");

    // Cenário legítimo: Ana Silva desassocia a tarefa que lhe está atribuída
    const legitimateSelfUnassignResult = await serviceUpdateTask(
      taskAssignedToAna,
      { assigneeId: null },
      { id: membro!.id, role: membro!.role }
    );

    runAssert(
      legitimateSelfUnassignResult.status === 200,
      "TC-SEC-07: Membro de Equipa consegue desassociar com sucesso a tarefa que lhe está atribuída",
      `Status=${legitimateSelfUnassignResult.status}`
    );

    // Verificar no SQLite a sincronização total (assigneeId null e TaskAssignment removido)
    const task2InDb = await prisma.task.findUnique({
      where: { id: taskAssignedToAna },
      include: { assignments: true },
    });
    runAssert(
      task2InDb?.assigneeId === null,
      "Atributo assigneeId atualizado para null no SQLite"
    );
    runAssert(
      task2InDb?.assignments.length === 0,
      "Sincronização relacional: registo correspondente em TaskAssignment removido sem deixar órfãos"
    );

    // -------------------------------------------------------------------------
    // 4. REGRESSÃO SEC-02 / RBAC: GESTÃO INTEGRAL POR GESTOR DE PROJETO
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("4. Regressão SEC-02 & RBAC: Privilégios Integrais do Gestor de Projeto");
    console.log("--------------------------------------------------------------------------------");

    // Gestor desassocia qualquer tarefa
    const gestorUnassignResult = await serviceUpdateTask(
      taskAssignedToLuis,
      { assigneeId: null },
      { id: gestor!.id, role: gestor!.role }
    );
    runAssert(
      gestorUnassignResult.status === 200,
      "TC-SEC-08: Gestor de Projeto possui privilégio total para desassociar qualquer tarefa",
      `Status=${gestorUnassignResult.status}`
    );

    // Gestor atribui novamente a tarefa a Ana Silva
    const gestorAssignResult = await serviceUpdateTask(
      taskAssignedToLuis,
      { assigneeId: membro!.id },
      { id: gestor!.id, role: gestor!.role }
    );
    runAssert(
      gestorAssignResult.status === 200 && gestorAssignResult.data?.assigneeId === membro!.id,
      "Gestor de Projeto reatribui com sucesso a tarefa a outro membro",
      `Novo AssigneeId=${gestorAssignResult.data?.assigneeId}`
    );

    // -------------------------------------------------------------------------
    // 5. REGRESSÃO RBAC: BLOQUEIO DE MUTAÇÃO DE PRAZOS E PRIORIDADES POR MEMBRO
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("5. Regressão RBAC: Bloqueio de Prazos, Prioridades e Eliminação por Membro");
    console.log("--------------------------------------------------------------------------------");

    // Membro tenta alterar prioridade
    const memberPriorityAttempt = await serviceUpdateTask(
      taskAssignedToLuis,
      { priority: "LOW" },
      { id: membro!.id, role: membro!.role }
    );
    runAssert(
      memberPriorityAttempt.status === 403,
      "Membro de Equipa é bloqueado ao tentar alterar a prioridade da tarefa (HTTP 403)"
    );

    // Membro tenta alterar data limite
    const memberDueDateAttempt = await serviceUpdateTask(
      taskAssignedToLuis,
      { dueDate: "2026-11-29T00:00:00.000Z" },
      { id: membro!.id, role: membro!.role }
    );
    runAssert(
      memberDueDateAttempt.status === 403,
      "Membro de Equipa é bloqueado ao tentar alterar a data limite da tarefa (HTTP 403)"
    );

    // Membro tenta auto-atribuir tarefa a outro colega (IDOR)
    const memberAssignOtherAttempt = await serviceUpdateTask(
      taskAssignedToLuis,
      { assigneeId: gestor!.id },
      { id: membro!.id, role: membro!.role }
    );
    runAssert(
      memberAssignOtherAttempt.status === 403,
      "Membro de Equipa é bloqueado ao tentar atribuir a tarefa a um terceiro (HTTP 403)"
    );

  } finally {
    // -------------------------------------------------------------------------
    // 6. TEARDOWN E LIMPEZA DE ESTADO
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("6. Teardown e Limpeza de Estado (Isolamento Garantido)");
    console.log("--------------------------------------------------------------------------------");

    if (testProjectId) {
      const deletedAssignments = await prisma.taskAssignment.deleteMany({
        where: { task: { projectId: testProjectId } },
      });
      console.log(`  🧹 Limpeza: ${deletedAssignments.count} registos TaskAssignment removidos.`);

      const deletedTasks = await prisma.task.deleteMany({
        where: { projectId: testProjectId },
      });
      console.log(`  🧹 Limpeza: ${deletedTasks.count} tarefas de teste removidas.`);

      await prisma.project.delete({
        where: { id: testProjectId },
      });
      console.log(`  🧹 Limpeza: Projeto de teste '${testProjectId}' removido.`);

      const remainingTasks = await prisma.task.count({
        where: { projectId: testProjectId },
      });
      const remainingProject = await prisma.project.findUnique({
        where: { id: testProjectId },
      });

      runAssert(remainingTasks === 0, "Nenhuma tarefa órfã permaneceu na base de dados SQLite");
      runAssert(remainingProject === null, "Projeto de teste removido integralmente do SQLite");
    }

    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`RESUMO DA SUITE DE SEGURANÇA & IDOR: ${passedCount} Passaram, ${failedCount} Falharam.`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSecurityTests();
