import { NextResponse } from "next/server";
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
          message: "Sessão inválida ou inexistente. Por favor inicie sessão.",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Erro na rota GET /api/v1/auth/me:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro interno ao obter a sessão.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
