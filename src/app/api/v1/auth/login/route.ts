import { NextResponse } from "next/server";
import { authenticate, getSetCookieHeader } from "@/modules/auth/auth.service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Endereço de email inválido"),
  password: z.string().min(1, "A palavra-passe é obrigatória"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: "Bad Request",
          message: "Dados de autenticação inválidos",
          details: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const authResult = await authenticate(email, password);

    if (!authResult) {
      return NextResponse.json(
        {
          statusCode: 401,
          error: "Unauthorized",
          message: "Credenciais inválidas. Verifique o email e a palavra-passe.",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      {
        user: authResult.user,
        token: authResult.token,
      },
      { status: 200 }
    );

    // Definir Cookie HTTP-only seguro
    response.headers.set("Set-Cookie", getSetCookieHeader(authResult.token));
    return response;
  } catch (error) {
    console.error("Erro na rota POST /api/v1/auth/login:", error);
    return NextResponse.json(
      {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Ocorreu um erro interno durante a autenticação.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
