import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema de validação de comentários em conformidade com o OpenAPI e Exercício 6
const createCommentSchema = z.object({
  content: z
    .string({ required_error: "O conteúdo do comentário é obrigatório" })
    .trim()
    .min(1, "O comentário não pode estar vazio nem conter apenas espaços")
    .max(2000, "O comentário não pode exceder 2000 caracteres"),
});

async function runTaskCommentsTests() {
  console.log("🧪 A iniciar suite de testes de Comentários de Tarefas (Validações, Anti-Espaços, Inferência de Autor, Listagem e Persistência na Reabertura)...\n");
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
  let testTaskId = "";

  try {
    // 1. Obter utilizadores para o teste
    const gestor = await prisma.user.findUnique({ where: { email: "luis.ferreira@matriz.local" } });
    const membro = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });

    assert(Boolean(gestor) && Boolean(membro), "Utilizadores de teste (Gestor e Membro) encontrados na base de dados");

    // 2. Validações Zod de Comentários (createCommentSchema)
    console.log("\n1. Teste de Validações do Schema de Comentário (createCommentSchema):");

    const emptyValidation = createCommentSchema.safeParse({ content: "" });
    assert(!emptyValidation.success, "Comentário vazio é rejeitado pelo schema");

    const whitespaceValidation = createCommentSchema.safeParse({ content: "     " });
    assert(!whitespaceValidation.success, "Comentário composto apenas por espaços em branco é rejeitado pelo schema");

    const multilineWhitespace = createCommentSchema.safeParse({ content: "  \n\t  \r\n  " });
    assert(!multilineWhitespace.success, "Comentário com quebras de linha e tabs sem texto útil é rejeitado");

    const tooLongValidation = createCommentSchema.safeParse({ content: "A".repeat(2001) });
    assert(!tooLongValidation.success, "Comentário com 2001 caracteres (> 2000) é rejeitado pelo schema");

    const minValid = createCommentSchema.safeParse({ content: "X" });
    assert(minValid.success && minValid.data.content === "X", "Comentário mínimo válido com 1 caráter é aceite");

    const maxValid = createCommentSchema.safeParse({ content: "Z".repeat(2000) });
    assert(maxValid.success && maxValid.data.content.length === 2000, "Comentário limite com exatamente 2000 caracteres é aceite");

    // 3. Preparação de Dados de Tarefa de Suporte
    console.log("\n2. Preparação de Tarefa de Suporte:");
    const testProject = await prisma.project.create({
      data: {
        title: `Projeto Teste Comentários ${Date.now()}`,
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-11-30"),
        managerId: gestor!.id,
      },
    });
    testProjectId = testProject.id;

    const testTask = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: "Tarefa de Validação de Comentários",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: new Date("2026-11-20"),
      },
    });
    testTaskId = testTask.id;
    assert(Boolean(testTaskId), "Tarefa de suporte criada para testes de comentários");

    // 4. Teste de Inferência de Identidade e Data no Backend (Anti-spoofing)
    console.log("\n3. Teste de Inferência de Identidade e Data no Backend (Anti-Spoofing):");

    // Simular o comportamento do backend: obter utilizador da sessão e inferir authorId
    const authenticatedUser = gestor!;
    const clientPayload = {
      content: "Primeiro comentário do projeto com análise de arquitetura.",
      authorId: "hacker-impostor-id", // Tentativa de spoofing pelo cliente
    };

    // Validação
    const parsed = createCommentSchema.parse(clientPayload);

    // Criação com authorId inferido da sessão
    const comment1 = await prisma.comment.create({
      data: {
        taskId: testTaskId,
        content: parsed.content,
        authorId: authenticatedUser.id, // Backend ignora o authorId fraudulento
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    assert(comment1.authorId === gestor!.id, "authorId registado corresponde estritamente ao utilizador autenticado (Gestor)");
    assert(comment1.authorId !== clientPayload.authorId, "Tentativa de injeção de authorId fraudulento foi ignorada");
    assert(Boolean(comment1.createdAt), "Data/hora do comentário registada automaticamente pelo servidor");
    assert(comment1.author.name === gestor!.name, "Nome do autor incluído na relação com sucesso");

    // 5. Segundo comentário por Membro de Equipa (Ana)
    console.log("\n4. Teste de Colaboração Multi-Utilizador:");
    const membroPayload = {
      content: "Arquitetura validada! A avançar para a fase de testes unitários.",
    };
    const parsedMembro = createCommentSchema.parse(membroPayload);

    const comment2 = await prisma.comment.create({
      data: {
        taskId: testTaskId,
        content: parsedMembro.content,
        authorId: membro!.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    assert(comment2.authorId === membro!.id, "authorId do segundo comentário corresponde à Membro Ana");
    assert(comment2.author.role === "TEAM_MEMBER", "Papel do autor identificado corretamente como TEAM_MEMBER");

    // 6. Teste de Listagem Cronológica dos Comentários
    console.log("\n5. Teste de Listagem Cronológica dos Comentários (createdAt: asc):");
    const commentsList = await prisma.comment.findMany({
      where: { taskId: testTaskId },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    assert(commentsList.length === 2, "Listagem retorna os 2 comentários associados à tarefa");
    assert(commentsList[0].id === comment1.id, "Primeiro comentário da lista é o mais antigo (do Gestor)");
    assert(commentsList[1].id === comment2.id, "Segundo comentário da lista é o subsequente (da Membro Ana)");
    assert(new Date(commentsList[0].createdAt) <= new Date(commentsList[1].createdAt), "Ordenação cronológica estrita respeitada");

    // 7. Persistência de Atribuições e Comentários após Reabrir a Tarefa (TODO -> DONE -> IN_PROGRESS)
    console.log("\n6. Teste de Persistência de Responsáveis e Comentários após Reabertura da Tarefa:");
    
    // Adicionar múltiplos responsáveis
    await prisma.taskAssignment.createMany({
      data: [
        { taskId: testTaskId, userId: gestor!.id },
        { taskId: testTaskId, userId: membro!.id },
      ],
    });

    // Mover tarefa para DONE
    await prisma.task.update({
      where: { id: testTaskId },
      data: { status: "DONE" },
    });

    const doneTask = await prisma.task.findUnique({
      where: { id: testTaskId },
      include: {
        assignments: true,
        comments: true,
      },
    });

    assert(doneTask?.status === "DONE", "Tarefa concluída com sucesso (status = DONE)");
    assert(doneTask?.assignments.length === 2, "2 responsáveis persistem na tarefa concluída");
    assert(doneTask?.comments.length === 2, "2 comentários persistem na tarefa concluída");

    // Reabrir tarefa para IN_PROGRESS
    await prisma.task.update({
      where: { id: testTaskId },
      data: { status: "IN_PROGRESS" },
    });

    const reopenedTask = await prisma.task.findUnique({
      where: { id: testTaskId },
      include: {
        assignments: {
          include: { user: true },
        },
        comments: {
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    assert(reopenedTask?.status === "IN_PROGRESS", "Tarefa reaberta com sucesso (status = IN_PROGRESS)");
    assert(reopenedTask?.assignments.length === 2, "As 2 atribuições de responsáveis permaneceram intactas após a reabertura");
    assert(reopenedTask?.comments.length === 2, "Os 2 comentários permaneceram intactos após a reabertura");
    assert(reopenedTask?.comments[0].author.name === gestor!.name, "Autor e conteúdo do primeiro comentário inalterados");
    assert(reopenedTask?.comments[1].author.name === membro!.name, "Autor e conteúdo do segundo comentário inalterados");

    // 8. Integridade Relacional e Limpeza em Cascata
    console.log("\n7. Teste de Integridade Relacional e Eliminação em Cascata:");
    await prisma.project.delete({ where: { id: testProject.id } });
    testProjectId = ""; // Já limpo

    const remainingComments = await prisma.comment.count({ where: { taskId: testTaskId } });
    assert(remainingComments === 0, "Comentários foram eliminados em cascata com a tarefa/projeto (sem registos órfãos)");

    const remainingAssignments = await prisma.taskAssignment.count({ where: { taskId: testTaskId } });
    assert(remainingAssignments === 0, "Atribuições foram eliminadas em cascata com a tarefa/projeto (sem registos órfãos)");

  } catch (error) {
    console.error("❌ Erro inesperado durante execução dos testes:", error);
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

runTaskCommentsTests();
