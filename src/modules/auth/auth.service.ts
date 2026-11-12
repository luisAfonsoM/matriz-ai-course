import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "./password";
import { User } from "@prisma/client";

const AUTH_SECRET = process.env.AUTH_SECRET || "matriz-poc-super-secret-key-2026-auth";
const SESSION_COOKIE_NAME = "matriz_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 horas

export interface TokenPayload {
  userId: string;
  role: string;
  exp: number;
}

/**
 * Assina e codifica um token de sessão usando HMAC-SHA256
 */
export function signSessionToken(userId: string, role: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload: TokenPayload = { userId, role, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

/**
 * Valida a assinatura e expiração do token de sessão
 */
export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadBase64, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payloadBase64)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Autentica um utilizador verificando email e palavra-passe
 */
export async function authenticate(email: string, password: string): Promise<{ user: Omit<User, "passwordHash">; token: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const token = signSessionToken(user.id, user.role);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

/**
 * Extrai a identidade do utilizador a partir da requisição HTTP (Cookie, Bearer token ou X-User-Id)
 */
export async function getAuthenticatedUser(request: Request): Promise<Omit<User, "passwordHash"> | null> {
  // 1. Verificar Cookie HTTP-only
  const cookieHeader = request.headers.get("cookie");
  let token: string | null = null;

  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (match) {
      token = match.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }

  // 2. Verificar cabeçalho Authorization: Bearer <token>
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  let userId: string | null = null;

  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      userId = payload.userId;
    }
  }

  // 3. Fallback controlado para X-User-Id (útil para automação de testes e chamadas diretas com ID)
  if (!userId) {
    const xUserId = request.headers.get("x-user-id");
    if (xUserId) {
      userId = xUserId;
    }
  }

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Validação rigorosa de autenticação (lança erro 401 se não autenticado)
 */
export async function requireAuth(request: Request): Promise<Omit<User, "passwordHash">> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Response(
      JSON.stringify({
        statusCode: 401,
        error: "Unauthorized",
        message: "Sessão inválida ou inexistente. Por favor inicie sessão.",
        timestamp: new Date().toISOString(),
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

/**
 * Validação rigorosa de RBAC (lança erro 403 se o perfil do utilizador não estiver autorizado)
 */
export async function requireRole(
  request: Request,
  allowedRoles: string[]
): Promise<Omit<User, "passwordHash">> {
  const user = await requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Response(
      JSON.stringify({
        statusCode: 403,
        error: "Forbidden",
        message: `Acesso negado. A operação requer um dos seguintes papéis: ${allowedRoles.join(", ")}.`,
        timestamp: new Date().toISOString(),
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

/**
 * Gera os cabeçalhos de Cookie para início e fim de sessão
 */
export function getSetCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function getClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
