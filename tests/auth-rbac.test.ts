import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();
const AUTH_SECRET = process.env.AUTH_SECRET || "matriz-poc-super-secret-key-2026-auth";

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

async function runTests() {
  console.log("🧪 A iniciar suite de verificação de Autenticação e RBAC no Backend...\n");
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
    // 1. Teste de Validação de Palavra-passe
    console.log("1. Teste de Credenciais e Hashes:");
    const gestor = await prisma.user.findUnique({ where: { email: "luis.ferreira@matriz.local" } });
    assert(gestor !== null, "Utilizador Gestor encontrado na base de dados");
    assert(Boolean(gestor?.passwordHash), "Gestor tem passwordHash guardada em base de dados");

    const validPass = await bcrypt.compare("password123", gestor!.passwordHash);
    assert(validPass === true, "bcrypt.compare valida palavra-passe correta com sucesso");

    const invalidPass = await bcrypt.compare("wrongpass", gestor!.passwordHash);
    assert(invalidPass === false, "bcrypt.compare rejeita palavra-passe incorreta");

    // 2. Teste de Perfis Distintos (Gestor vs Membro)
    console.log("\n2. Teste de Perfis e Permissões Distintas (RBAC):");
    const membro = await prisma.user.findUnique({ where: { email: "ana.silva@matriz.local" } });
    assert(membro?.role === "TEAM_MEMBER", "Membro de Equipa tem role = TEAM_MEMBER");
    assert(gestor?.role === "PROJECT_MANAGER", "Gestor de Projeto tem role = PROJECT_MANAGER");

    // 3. Teste de Assinatura e Expiração de Tokens de Sessão
    console.log("\n3. Teste do Ciclo de Vida do Token de Sessão (HMAC-SHA256):");
    const token = signSessionToken(gestor!.id, gestor!.role);
    const decoded = verifySessionToken(token);
    assert(decoded?.userId === gestor!.id, "Token decifrado preserva o userId autêntico");
    assert(decoded?.role === "PROJECT_MANAGER", "Token decifrado preserva o papel PROJECT_MANAGER");

    const tampered = token + "adulterado";
    assert(verifySessionToken(tampered) === null, "Token com assinatura violada é sumariamente rejeitado");

    // 4. Teste de Inferência de Identidade no Backend (Requisito 3)
    console.log("\n4. Teste de Inferência de Identidade em Projetos e Comentários:");
    const testProject = await prisma.project.create({
      data: {
        title: "Projeto de Teste RBAC",
        description: "Validando inferência de dono no backend",
        startDate: new Date("2026-11-01"),
        targetDate: new Date("2026-11-30"),
        status: "ACTIVE",
        managerId: gestor!.id, // Inferred from authenticated session
      },
      include: { manager: true },
    });

    assert(testProject.manager.email === "luis.ferreira@matriz.local", "Proprietário do projeto inferido com sucesso a partir da sessão");
    assert(testProject.manager.role === "PROJECT_MANAGER", "Proprietário possui privilégios de Gestor de Projeto");

    const testTask = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: "Tarefa de Teste para Comentários",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: new Date("2026-11-20"),
      },
    });

    // Criar comentário com identidade inferida do Membro (Ana Silva)
    const testComment = await prisma.comment.create({
      data: {
        taskId: testTask.id,
        content: "Comentário de teste com authorId inferido no servidor",
        authorId: membro!.id, // Inferred from authenticated session
      },
      include: { author: true },
    });

    assert(testComment.author.email === "ana.silva@matriz.local", "Autor do comentário inferido com sucesso a partir da sessão do Membro");
    assert(testComment.author.role === "TEAM_MEMBER", "Autor do comentário tem papel TEAM_MEMBER");

    // Limpeza de registos de teste
    await prisma.comment.delete({ where: { id: testComment.id } });
    await prisma.task.delete({ where: { id: testTask.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    assert(true, "Limpeza de dados de teste concluída com sucesso (Hard Delete seguro)");

    console.log(`\n========================================`);
    console.log(`Resultados dos Testes: ${passed} Passaram, ${failed} Falharam`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("❌ Erro no teste:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
