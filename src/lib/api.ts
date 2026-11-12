/**
 * Cliente HTTP centralizado para a API do Matriz (Frontend)
 * Centraliza a configuração do endereço do backend e o tratamento de erros.
 */

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  timestamp?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Função utilitária para efetuar pedidos à API com tratamento normalizado de erros
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null; ok: boolean }> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const error: ApiError = {
        statusCode: response.status,
        error: data?.error || response.statusText,
        message: data?.message || "Ocorreu um erro na comunicação com o servidor.",
        details: data?.details,
        timestamp: data?.timestamp,
      };
      return { data: null, error, ok: false };
    }

    return { data: data as T, error: null, ok: true };
  } catch (err: any) {
    const networkError: ApiError = {
      statusCode: 0,
      error: "Network Error",
      message: err.message || "Não foi possível ligar ao servidor da API. Verifique a sua ligação.",
    };
    return { data: null, error: networkError, ok: false };
  }
}
