/**
 * DESAFIO B — OBSERVABILIDADE: TESTES DE DISPONIBILIDADE E LOGS ESTRUTURADOS
 * 
 * Validação do endpoint /api/health e do logger estruturado em formato JSON.
 */

import assert from "node:assert/strict";
import { GET } from "../src/app/api/health/route.ts";
import { logger, log } from "../src/lib/logger.ts";

console.log("================================================================================");
console.log("📊 DESAFIO B — OBSERVABILIDADE: TESTES DE SAÚDE, DISPONIBILIDADE E LOGS");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (error: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     └─ Erro: ${error.message}`);
    failedCount++;
  }
}

async function runAll() {
  console.log("--------------------------------------------------------------------------------");
  console.log("1. Validação do Endpoint Especializado /api/health");
  console.log("--------------------------------------------------------------------------------");

  await runTest("TC-HLT-01: Endpoint GET /api/health responde com HTTP 200 OK", async () => {
    const res = await GET();
    assert.equal(res.status, 200, "Deve responder com HTTP 200 quando todos os serviços estão saudáveis");
  });

  await runTest("TC-HLT-02: Estrutura da resposta contém status 'healthy' e metadados de serviço", async () => {
    const res = await GET();
    const data = await res.json();

    assert.equal(data.status, "healthy");
    assert.equal(data.service, "matriz-app");
    assert.equal(data.version, "1.1.0-rc.1");
    assert.ok(data.timestamp, "Deve conter timestamp ISO UTC");
    assert.ok(typeof data.uptimeSeconds === "number" && data.uptimeSeconds >= 0, "Uptime deve ser numérico não-negativo");
    assert.ok(typeof data.durationMs === "number" && data.durationMs >= 0, "Duração total deve ser calculada");
  });

  await runTest("TC-HLT-03: Verificação ativa do SQLite devolve status 'up' com latência medida", async () => {
    const res = await GET();
    const data = await res.json();

    assert.ok(data.checks, "Deve conter objeto checks");
    assert.ok(data.checks.database, "Deve conter checks.database");
    assert.equal(data.checks.database.status, "up");
    assert.equal(data.checks.database.dialect, "sqlite");
    assert.ok(typeof data.checks.database.latencyMs === "number", "Latência deve ser numérica");
    assert.ok(data.checks.database.latencyMs >= 0, "Latência do SQLite deve ser >= 0ms");
  });

  await runTest("TC-HLT-04: Verificação de recursos do sistema reporta métricas de memória em MB", async () => {
    const res = await GET();
    const data = await res.json();

    assert.ok(data.checks.system, "Deve conter checks.system");
    assert.ok(data.checks.system.memoryHeapUsedMB > 0, "Heap de memória usado deve ser > 0 MB");
    assert.ok(data.checks.system.memoryRssMB > 0, "RSS de memória deve ser > 0 MB");
  });

  await runTest("TC-HLT-05: Cabeçalhos HTTP proíbem cache para garantir monitorização em tempo real", async () => {
    const res = await GET();
    const cacheControl = res.headers.get("Cache-Control");
    assert.ok(cacheControl, "Deve definir cabeçalho Cache-Control");
    assert.match(cacheControl, /no-store|no-cache/i);
  });

  console.log("\n--------------------------------------------------------------------------------");
  console.log("2. Validação do Módulo de Logs Estruturados em JSON (src/lib/logger.ts)");
  console.log("--------------------------------------------------------------------------------");

  await runTest("TC-LOG-01: Função log emite objeto com estrutura canónica (timestamp, level, service, message)", () => {
    const entry = log("info", "Pedido HTTP processado com sucesso", { path: "/api/health", status: 200 });

    assert.equal(entry.level, "info");
    assert.equal(entry.service, "matriz-app");
    assert.equal(entry.message, "Pedido HTTP processado com sucesso");
    assert.ok(entry.context, "Deve conter contexto estruturado");
    assert.equal(entry.context.path, "/api/health");
    assert.equal(entry.context.status, 200);
    assert.ok(entry.timestamp, "Deve conter timestamp ISO UTC");
  });

  await runTest("TC-LOG-02: Métodos auxiliares de conveniência (info, warn, error) funcionam corretamente", () => {
    const infoEntry = logger.info("Informação operacional", { user: "admin" });
    assert.equal(infoEntry.level, "info");

    const warnEntry = logger.warn("Aviso de memória elevada", { heapMB: 150 });
    assert.equal(warnEntry.level, "warn");

    const errorEntry = logger.error("Falha ao comunicar com base de dados", { code: "SQLITE_BUSY" });
    assert.equal(errorEntry.level, "error");
  });

  console.log("\n================================================================================");
  console.log(`RESUMO DA SUITE DE OBSERVABILIDADE: ${passedCount} Passaram, ${failedCount} Falharam.`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll();
