import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 A iniciar o povoamento reproduzível da base de dados (seed)...");

  // Hash da palavra-passe padrão de demonstração para todos os utilizadores
  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  // 1. Criar Utilizadores (Idempotente via upsert por email)
  const gestor = await prisma.user.upsert({
    where: { email: "luis.ferreira@matriz.local" },
    update: { 
      name: "Luís Ferreira", 
      role: "PROJECT_MANAGER",
      passwordHash: defaultPasswordHash,
    },
    create: {
      id: "u1111111-1111-1111-1111-111111111111",
      name: "Luís Ferreira",
      email: "luis.ferreira@matriz.local",
      role: "PROJECT_MANAGER",
      passwordHash: defaultPasswordHash,
    },
  });

  const membro1 = await prisma.user.upsert({
    where: { email: "ana.silva@matriz.local" },
    update: { 
      name: "Ana Silva", 
      role: "TEAM_MEMBER",
      passwordHash: defaultPasswordHash,
    },
    create: {
      id: "u2222222-2222-2222-2222-222222222222",
      name: "Ana Silva",
      email: "ana.silva@matriz.local",
      role: "TEAM_MEMBER",
      passwordHash: defaultPasswordHash,
    },
  });

  const membro2 = await prisma.user.upsert({
    where: { email: "carlos.ramos@matriz.local" },
    update: { 
      name: "Carlos Ramos", 
      role: "TEAM_MEMBER",
      passwordHash: defaultPasswordHash,
    },
    create: {
      id: "u3333333-3333-3333-3333-333333333333",
      name: "Carlos Ramos",
      email: "carlos.ramos@matriz.local",
      role: "TEAM_MEMBER",
      passwordHash: defaultPasswordHash,
    },
  });

  console.log(`✅ 3 Utilizadores configurados: ${gestor.name} (${gestor.role}), ${membro1.name}, ${membro2.name}`);

  // 2. Criar Projetos (Idempotente via upsert)
  const proj1 = await prisma.project.upsert({
    where: { id: "p1111111-1111-1111-1111-111111111111" },
    update: { title: "Migração Cloud v2", status: "ACTIVE" },
    create: {
      id: "p1111111-1111-1111-1111-111111111111",
      title: "Migração Cloud v2",
      description: "Transição da infraestrutura de servidores locais para modelo cloud híbrido.",
      startDate: new Date("2026-10-15T09:00:00.000Z"),
      targetDate: new Date("2026-11-30T23:59:59.000Z"),
      status: "ACTIVE",
      managerId: gestor.id,
    },
  });

  const proj2 = await prisma.project.upsert({
    where: { id: "p2222222-2222-2222-2222-222222222222" },
    update: { title: "Redesenho Portal do Cliente", status: "ACTIVE" },
    create: {
      id: "p2222222-2222-2222-2222-222222222222",
      title: "Redesenho Portal do Cliente",
      description: "Nova experiência digital para os clientes com painel self-service moderno.",
      startDate: new Date("2026-11-01T09:00:00.000Z"),
      targetDate: new Date("2026-12-15T23:59:59.000Z"),
      status: "ACTIVE",
      managerId: gestor.id,
    },
  });

  console.log(`✅ 2 Projetos configurados: "${proj1.title}" e "${proj2.title}"`);

  // 3. Criar Tarefas no Projeto 1 (Cobrem TODO, IN_PROGRESS, DONE, Atrasadas e Futuras)
  const tasksSeed = [
    {
      id: "t1000001-0000-0000-0000-000000000001",
      projectId: proj1.id,
      assigneeId: membro2.id,
      title: "Criar migração Prisma e modelos de dados",
      description: "Estruturar modelos relacionais de Users, Projects e Tasks no schema.prisma.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-11-02T23:59:59.000Z"), // Em atraso (3 dias atrás face a 05/11)
    },
    {
      id: "t1000002-0000-0000-0000-000000000002",
      projectId: proj1.id,
      assigneeId: membro1.id,
      title: "Configurar suite de testes unitários",
      description: "Configurar testes de validação para os endpoints principais com Vitest/Jest.",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: new Date("2026-11-04T23:59:59.000Z"), // Em atraso (1 dia atrás)
    },
    {
      id: "t1000003-0000-0000-0000-000000000003",
      projectId: proj1.id,
      assigneeId: membro2.id,
      title: "Implementar rota POST /tasks",
      description: "Desenvolver rota e validação com schema Zod no backend para o Gestor.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-11-05T23:59:59.000Z"), // Expira hoje
    },
    {
      id: "t1000004-0000-0000-0000-000000000004",
      projectId: proj1.id,
      assigneeId: membro1.id,
      title: "Definição de regras de acesso (RBAC)",
      description: "Mapear permissões de Gestor de Projeto vs Membro de Equipa no backend.",
      priority: "HIGH",
      status: "DONE",
      dueDate: new Date("2026-11-03T23:59:59.000Z"), // Concluída
    },
    {
      id: "t1000005-0000-0000-0000-000000000005",
      projectId: proj1.id,
      assigneeId: null, // Não atribuída (Backlog)
      title: "Desenhar protótipo de alta fidelidade do Kanban",
      description: "Ajustar layout visual das 3 colunas e cartões de tarefa para acessibilidade.",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: new Date("2026-11-12T23:59:59.000Z"),
    },
    {
      id: "t1000006-0000-0000-0000-000000000006",
      projectId: proj1.id,
      assigneeId: membro1.id,
      title: "Levantamento de requisitos de segurança",
      description: "Validação defensiva de inputs e prevenção de injeções de código.",
      priority: "LOW",
      status: "DONE",
      dueDate: new Date("2026-10-31T23:59:59.000Z"), // Concluída no passado
    },
  ];

  for (const t of tasksSeed) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: { status: t.status, priority: t.priority },
      create: t,
    });
  }

  console.log(`✅ ${tasksSeed.length} Tarefas configuradas para "${proj1.title}"`);

  // 4. Criar Comentários de Exemplo
  await prisma.comment.upsert({
    where: { id: "c1000001-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "c1000001-0000-0000-0000-000000000001",
      taskId: "t1000001-0000-0000-0000-000000000001",
      authorId: gestor.id,
      content: "Por favor priorizar esta tarefa para desbloquear os endpoints da API.",
    },
  });

  await prisma.comment.upsert({
    where: { id: "c1000002-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "c1000002-0000-0000-0000-000000000002",
      taskId: "t1000001-0000-0000-0000-000000000001",
      authorId: membro2.id,
      content: "Esquema Prisma validado, a preparar script de migração.",
    },
  });

  console.log("✅ Comentários de exemplo registados com sucesso");
  console.log("🎉 Povoamento da base de dados concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
