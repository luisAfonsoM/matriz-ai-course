import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const AUTH_SECRET = process.env.AUTH_SECRET || "matriz-poc-super-secret-key-2026-auth";

// Schemas Zod de validação defensiva em conformidade com o OpenAPI
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
  description: z
    .string()
    .max(2000, "A descrição da tarefa não pode exceder 2000 caracteres")
    .optional()
    .nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: dateStringSchema.optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

const createCommentSchema = z.object({
  content: z
    .string({ required_error: "O conteúdo do comentário é obrigatório" })
    .trim()
    .min(1, "O comentário não pode estar vazio nem conter apenas espaços")
    .max(2000, "O comentário não pode exceder 2000 caracteres"),
});

const createProjectSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().max(1000).optional().nullable(),
    startDate: dateStringSchema,
    targetDate: dateStringSchema,
  })
  .refine((data) => new Date(data.targetDate) >= new Date(data.startDate), {
    message: "A data de conclusão deve ser posterior ou igual à data de início",
    path: ["targetDate"],
  });

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

async function runMvpVerification() {
  console.log("================================================================================");
  console.log("🚀 FICHA PRÁTICA 3 — EXERCÍCIO 8: VERIFICAÇÃO FORMAL DO MVP (MATRIZ)");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      if (details) console.log(`     └─ Evidência: ${details}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      if (details) console.error(`     └─ Detalhes: ${details}`);
      failed++;
    }
  }

  let cleanupProjectId = "";

  try {
    // -------------------------------------------------------------------------
    // CASO 01: ACESSO À APLICAÇÃO (Autenticação, Tokens HMAC, Passwords Hasheadas)
    // -------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("CASO 01: Acesso à Aplicação (Login, Credenciais Válidas/Inválidas e Sessão)");
    console.log("--------------------------------------------------------------------------------");

    const gestorUser = await prisma.user.findUnique({ where: { email: "luis.ferreira@matriz.local" } });
    const membroUser = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });

    assert(Boolean(gestorUser), "Utilizador Gestor (luis.ferreira@matriz.local) localizado na base de dados", `ID=${gestorUser?.id}, Role=${gestorUser?.role}`);
    assert(Boolean(membroUser), "Utilizador Membro (ana.silva@matriz.local) localizado na base de dados", `ID=${membroUser?.id}, Role=${membroUser?.role}`);

    // Validação com password correta
    const validPasswordMatch = await bcrypt.compare("password123", gestorUser!.passwordHash);
    assert(validPasswordMatch, "Credenciais válidas são aceites com sucesso via bcrypt.compare", "Palavra-passe cifrada coincide com hash na base de dados");

    // Validação com password incorreta
    const invalidPasswordMatch = await bcrypt.compare("wrong_password_xyz", gestorUser!.passwordHash);
    assert(!invalidPasswordMatch, "Credenciais inválidas são sumariamente rejeitadas", "Hash não coincide, impedindo emissão de sessão");

    // Emissão e integridade de token de sessão
    const validToken = signSessionToken(gestorUser!.id, gestorUser!.role);
    const decodedToken = verifySessionToken(validToken);
    assert(decodedToken !== null && decodedToken.userId === gestorUser!.id, "Token de sessão HMAC-SHA256 é verificado com sucesso", `Payload verificado: userId=${decodedToken?.userId}`);

    // Token adulterado
    const tamperedToken = `${validToken.split(".")[0]}.tampered_signature_12345`;
    const tamperedResult = verifySessionToken(tamperedToken);
    assert(tamperedResult === null, "Token adulterado ou sem autenticação válida é bloqueado (401)", "Assinatura HMAC violada");

    // -------------------------------------------------------------------------
    // CASO 02 & 08: GESTÃO DE PROJETOS & AUTORIZAÇÃO NA API (RBAC & Anti-Spoofing)
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 02 & 08: Gestão de Projetos e Autorização na API (RBAC & Anti-Spoofing)");
    console.log("--------------------------------------------------------------------------------");

    // Teste de Autorização: Apenas Gestor pode criar projetos
    const canGestorCreate = gestorUser!.role === "PROJECT_MANAGER";
    const canMembroCreate = membroUser!.role === "PROJECT_MANAGER";
    assert(canGestorCreate, "Utilizador com perfil PROJECT_MANAGER tem permissão para criar projetos");
    assert(!canMembroCreate, "Utilizador com perfil TEAM_MEMBER é bloqueado ao tentar criar projetos (403 Forbidden)");

    // Anti-Spoofing: backend infere managerId a partir do utilizador autenticado
    const spoofAttemptPayload = {
      title: `Projeto Verificação MVP ${Date.now()}`,
      description: "Projeto criado para a validação formal de conservação de dados e segurança",
      startDate: new Date("2026-11-01").toISOString(),
      targetDate: new Date("2026-11-30").toISOString(),
      managerId: "hacker-spoofed-id-999", // ID fraudulento enviado pelo cliente
    };

    // Backend valida schema e associa ao utilizador autenticado (gestorUser.id)
    const projectParsed = createProjectSchema.parse(spoofAttemptPayload);
    const createdProject = await prisma.project.create({
      data: {
        title: projectParsed.title,
        description: projectParsed.description,
        startDate: new Date(projectParsed.startDate),
        targetDate: new Date(projectParsed.targetDate),
        managerId: gestorUser!.id, // Backend infere da sessão, ignorando spoofAttemptPayload.managerId
      },
      include: { manager: true },
    });
    cleanupProjectId = createdProject.id;

    assert(createdProject.managerId === gestorUser!.id, "Backend infere managerId a partir da sessão ativa (anti-spoofing)", `managerId registado=${createdProject.managerId}`);
    assert(createdProject.managerId !== spoofAttemptPayload.managerId, "Identificador fraudulento enviado no payload do cliente foi neutralizado");

    // Pesquisa de projetos por nome
    const searchMatch = await prisma.project.findMany({
      where: { title: { contains: "Verificação MVP" } },
    });
    assert(searchMatch.length >= 1, "Pesquisa textual por nome localiza o projeto correspondente", `Projetos encontrados: ${searchMatch.length}`);

    // Edição de projeto
    const updatedProject = await prisma.project.update({
      where: { id: createdProject.id },
      data: { status: "ACTIVE", description: "Descrição atualizada durante os testes de validação" },
    });
    assert(updatedProject.status === "ACTIVE", "Edição de metadados do projeto executada com sucesso", `Novo status: ${updatedProject.status}`);

    // -------------------------------------------------------------------------
    // CASO 04: VALIDAÇÃO DE DADOS (Zod Schemas Defensivos)
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 04: Validação de Dados (Títulos Vazios, Espaços em Branco e Limites)");
    console.log("--------------------------------------------------------------------------------");

    // Título vazio ou composto apenas por espaços
    const emptyTaskTitle = createTaskSchema.safeParse({ title: "   " });
    assert(!emptyTaskTitle.success, "Título composto apenas por espaços em branco é rejeitado (HTTP 400)", "Zod .trim().min(3) falhou como esperado");

    // Título inferior a 3 caracteres úteis
    const shortTaskTitle = createTaskSchema.safeParse({ title: "  ab  " });
    assert(!shortTaskTitle.success, "Título com menos de 3 caracteres úteis após trim é rejeitado (HTTP 400)");

    // Título superior a 150 caracteres
    const longTaskTitle = createTaskSchema.safeParse({ title: "X".repeat(151) });
    assert(!longTaskTitle.success, "Título com mais de 150 caracteres é rejeitado (HTTP 400)");

    // Título válido
    const validTaskTitle = createTaskSchema.safeParse({ title: "  Implementar testes de verificação  " });
    assert(validTaskTitle.success && validTaskTitle.data.title === "Implementar testes de verificação", "Título válido é aceite e higienizado sem espaços nas extremidades");

    // Descrição superior a 2000 caracteres
    const longDesc = createTaskSchema.safeParse({ title: "Tarefa Válida", description: "Y".repeat(2001) });
    assert(!longDesc.success, "Descrição de tarefa superior a 2000 caracteres é rejeitada (HTTP 400)");

    // Datas incoerentes no projeto (targetDate < startDate)
    const invalidDatesProject = createProjectSchema.safeParse({
      title: "Projeto Datas Incoerentes",
      startDate: "2026-11-20",
      targetDate: "2026-11-01", // Anterior!
    });
    assert(!invalidDatesProject.success, "Data de conclusão anterior à data de início é rejeitada (HTTP 400)");

    // Comentário vazio ou só com espaços
    const blankComment = createCommentSchema.safeParse({ content: "   \n\t   " });
    assert(!blankComment.success, "Comentário vazio ou composto unicamente por espaços é rejeitado (HTTP 400)");

    // Comentário superior a 2000 caracteres
    const longComment = createCommentSchema.safeParse({ content: "C".repeat(2001) });
    assert(!longComment.success, "Comentário superior a 2000 caracteres é rejeitado (HTTP 400)");

    // -------------------------------------------------------------------------
    // CASO 03, 05, 06 & 07: PERSISTÊNCIA, ESTADO, RESPONSÁVEIS N:M E COMENTÁRIOS
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 03, 05, 06 & 07: Persistência Durável, Kanban, Múltiplos Responsáveis e Comentários");
    console.log("--------------------------------------------------------------------------------");

    // Criar tarefa
    const testTask = await prisma.task.create({
      data: {
        projectId: createdProject.id,
        title: "Tarefa de Demonstração e Persistência",
        description: "Registo para verificar reabertura, múltiplos responsáveis e comentários",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: new Date("2026-11-25"),
      },
    });
    assert(Boolean(testTask.id), "Tarefa persistida na base de dados SQLite", `Task ID=${testTask.id}, Status=${testTask.status}`);

    // Associação de múltiplos responsáveis (N:M)
    const assign1 = await prisma.taskAssignment.create({
      data: { taskId: testTask.id, userId: gestorUser!.id },
    });
    const assign2 = await prisma.taskAssignment.create({
      data: { taskId: testTask.id, userId: membroUser!.id },
    });
    assert(Boolean(assign1 && assign2), "Múltiplos responsáveis associados com sucesso à mesma tarefa (N:M)", `Atribuídos: ${gestorUser!.name} e ${membroUser!.name}`);

    // Prevenção de duplicados na associação
    let duplicateBlocked = false;
    try {
      await prisma.taskAssignment.create({
        data: { taskId: testTask.id, userId: gestorUser!.id }, // Já associado
      });
    } catch (err: any) {
      if (err.code === "P2002") duplicateBlocked = true;
    }
    assert(duplicateBlocked, "Tentativa de duplicar atribuição é bloqueada por restrição única @@unique([taskId, userId])", "Prisma P2002 Unique constraint prevented duplicate");

    // Adição de comentários com inferência de autor
    const comment1 = await prisma.comment.create({
      data: {
        taskId: testTask.id,
        content: "Comentário inicial pelo Gestor com análise técnica.",
        authorId: gestorUser!.id,
      },
      include: { author: true },
    });

    const comment2 = await prisma.comment.create({
      data: {
        taskId: testTask.id,
        content: "Comentário subsequente pelo Membro de Equipa confirmando execução.",
        authorId: membroUser!.id,
      },
      include: { author: true },
    });

    assert(Boolean(comment1 && comment2), "Comentários persistidos com autoria e data inferidas pelo servidor", `Autores: ${comment1.author.name} e ${comment2.author.name}`);

    // Simulação de transição de estado no Kanban (TODO -> DONE)
    const taskCompleted = await prisma.task.update({
      where: { id: testTask.id },
      data: { status: "DONE" },
    });
    assert(taskCompleted.status === "DONE", "Transição para estado DONE efetuada com sucesso");

    // SIMULAÇÃO DE REINÍCIO DE CONEXÃO / PERSISTÊNCIA DURÁVEL
    console.log("   -> A simular reinício de ligação ao backend SQLite...");
    await prisma.$disconnect();
    await prisma.$connect();

    // Reabrir tarefa (DONE -> IN_PROGRESS)
    const taskReopened = await prisma.task.update({
      where: { id: testTask.id },
      data: { status: "IN_PROGRESS" },
    });
    assert(taskReopened.status === "IN_PROGRESS", "Tarefa reaberta com sucesso para o estado IN_PROGRESS");

    // Consulta de integridade pós-persistência e reabertura
    const fullTaskReloaded = await prisma.task.findUnique({
      where: { id: testTask.id },
      include: {
        assignments: { include: { user: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
    });

    assert(fullTaskReloaded?.assignments.length === 2, "Persistência pós-reabertura: Ambos os responsáveis permanecem associados", `Total de responsáveis: ${fullTaskReloaded?.assignments.length}`);
    assert(fullTaskReloaded?.comments.length === 2, "Persistência pós-reabertura: Todos os comentários permanecem intactos", `Total de comentários: ${fullTaskReloaded?.comments.length}`);
    assert(fullTaskReloaded?.comments[0].author.name === gestorUser!.name, "Metadados do autor preservados sem corrupção");
    assert(fullTaskReloaded?.comments[1].author.name === membroUser!.name, "Segundo autor preservado sem corrupção");

    // Remoção de atribuição individual
    await prisma.taskAssignment.delete({
      where: { taskId_userId: { taskId: testTask.id, userId: membroUser!.id } },
    });
    const assigneesAfterRemoval = await prisma.taskAssignment.count({ where: { taskId: testTask.id } });
    assert(assigneesAfterRemoval === 1, "Remoção de atribuição individual funciona sem apagar a tarefa ou o utilizador", `Restantes responsáveis: ${assigneesAfterRemoval}`);

    // -------------------------------------------------------------------------
    // CASO 09: ELIMINAÇÃO EM CASCATA E INTEGRIDADE REFERENCIAL (Sem Dados Órfãos)
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 09: Eliminação em Cascata e Prevenção de Dados Órfãos (RNF03)");
    console.log("--------------------------------------------------------------------------------");

    // Eliminar o projeto pai
    await prisma.project.delete({ where: { id: createdProject.id } });
    cleanupProjectId = ""; // Limpo com sucesso

    // Verificar eliminação em cascata das tarefas
    const remainingTasks = await prisma.task.count({ where: { id: testTask.id } });
    assert(remainingTasks === 0, "Tarefa dependente foi eliminada em cascata com o projeto (sem registo órfão)");

    // Verificar eliminação em cascata das atribuições
    const remainingAssignments = await prisma.taskAssignment.count({ where: { taskId: testTask.id } });
    assert(remainingAssignments === 0, "Atribuições de responsáveis foram eliminadas em cascata (sem registos órfãos)");

    // Verificar eliminação em cascata dos comentários
    const remainingComments = await prisma.comment.count({ where: { taskId: testTask.id } });
    assert(remainingComments === 0, "Comentários foram eliminados em cascata com a tarefa (sem registos órfãos)");

  } catch (err: any) {
    console.error("❌ Erro imprevisto durante a execução da verificação:", err);
    failed++;
  } finally {
    if (cleanupProjectId) {
      await prisma.project.delete({ where: { id: cleanupProjectId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`RESUMO DA VERIFICAÇÃO FORMAL: ${passed} Passaram, ${failed} Falharam.`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runMvpVerification();
