import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/modules/auth/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          statusCode: 401,
          error: "Unauthorized",
          message: "Autenticação obrigatória para consultar utilizadores.",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Erro na rota GET /api/v1/users:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro interno ao listar utilizadores.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
