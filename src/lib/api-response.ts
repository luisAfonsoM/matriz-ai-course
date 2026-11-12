import { NextResponse } from "next/server";

export interface ApiErrorPayload {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  timestamp: string;
}

/**
 * Cria uma resposta HTTP de erro estruturada em estrita conformidade
 * com o schema ErrorResponse formalmente especificado em openapi.yaml.
 */
export function createErrorResponse(
  statusCode: number,
  error: string,
  message: string,
  details?: string[]
): NextResponse<ApiErrorPayload> {
  const payload: ApiErrorPayload = {
    statusCode,
    error,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details && details.length > 0) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status: statusCode });
}
