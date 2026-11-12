import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany();
  console.log("Utilizadores no SQLite:", users.map(u => `${u.name} (${u.role})`));

  const projects = await prisma.project.findMany({
    include: {
      tasks: true,
      manager: true,
    },
  });
  console.log("Projetos no SQLite:", projects.map(p => `"${p.title}" - Gestor: ${p.manager.name} (${p.tasks.length} tarefas)`));

  const comments = await prisma.comment.findMany();
  console.log("Comentários no SQLite:", comments.length);

  await prisma.$disconnect();
}

test();
