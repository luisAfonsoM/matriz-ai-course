/**
 * Módulo de Observabilidade: Logger Estruturado em JSON
 * Desafio B — Observabilidade & Disponibilidade
 * 
 * Emite registos estruturados em JSON para stdout/stderr, facilitando a ingestão
 * em stacks modernas de telemetria e análise de logs (Docker Logs, Datadog, ELK, CloudWatch).
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
  requestId?: string;
}

const SERVICE_NAME = "matriz-app";

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  extra?: Partial<LogEntry>
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    context,
    ...extra,
  };

  const jsonString = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(jsonString);
      break;
    case "warn":
      console.warn(jsonString);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(jsonString);
      }
      break;
    case "info":
    default:
      console.log(jsonString);
      break;
  }

  return entry;
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>, extra?: Partial<LogEntry>) =>
    log("info", msg, ctx, extra),
  warn: (msg: string, ctx?: Record<string, unknown>, extra?: Partial<LogEntry>) =>
    log("warn", msg, ctx, extra),
  error: (msg: string, ctx?: Record<string, unknown>, extra?: Partial<LogEntry>) =>
    log("error", msg, ctx, extra),
  debug: (msg: string, ctx?: Record<string, unknown>, extra?: Partial<LogEntry>) =>
    log("debug", msg, ctx, extra),
};
