import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/modules/auth/auth.service";
import { WorkspaceView } from "@/components/dashboard/WorkspaceView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. Verificar sessão ativa a partir do cookie HTTP-only
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("matriz_session");
  let currentUser = null;

  if (sessionCookie?.value) {
    const payload = verifySessionToken(sessionCookie.value);
    if (payload) {
      currentUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, role: true },
      });
    }
  }

  // 2. Consulta de metadados à base de dados para arranque rápido
  let dbStatus = "offline";
  let counts = { users: 0, projects: 0, tasks: 0, comments: 0 };

  try {
    const [uCount, pCount, tCount, cCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.comment.count(),
    ]);

    counts = { users: uCount, projects: pCount, tasks: tCount, comments: cCount };
    dbStatus = "online";
  } catch (error) {
    console.error("Erro ao conectar à base de dados SQLite:", error);
    dbStatus = "error";
  }

  return (
    <WorkspaceView
      currentUser={currentUser as any}
      initialCounts={counts}
      dbStatus={dbStatus}
    />
  );
}
