import { prisma } from "../../../lib/prisma.ts";
import { logger } from "../../../lib/logger.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus: "up" | "down" = "down";
  let dbLatencyMs = -1;
  let dbError: string | undefined;

  try {
    const dbStartTime = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    dbLatencyMs = Date.now() - dbStartTime;
    dbStatus = "up";
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : "Falha na ligação à base de dados SQLite";
    logger.error("Healthcheck: falha na base de dados SQLite", { error: dbError });
  }

  const memory = process.memoryUsage();
  const totalDurationMs = Date.now() - startTime;
  const isHealthy = dbStatus === "up";

  const responsePayload = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: "matriz-app",
    version: "1.1.0-rc.1",
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: {
        status: dbStatus,
        dialect: "sqlite",
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      system: {
        memoryHeapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        memoryRssMB: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      },
    },
    durationMs: totalDurationMs,
  };

  logger.info(
    `Healthcheck: ${responsePayload.status} (DB: ${dbStatus}, ${dbLatencyMs}ms)`,
    { isHealthy, dbLatencyMs, durationMs: totalDurationMs }
  );

  return Response.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
