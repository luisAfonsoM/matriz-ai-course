/**
 * FICHA PRÁTICA 4 — EXERCÍCIO 2: UNIT TESTING
 * 
 * Regra de Negócio em Teste: Validação do Título de uma Tarefa (RF04, US02, createTaskSchema)
 * - Título obrigatório (string)
 * - Remoção de espaços nos extremos (trim defensivo)
 * - Comprimento mínimo útil: 3 caracteres
 * - Comprimento máximo: 150 caracteres
 * - Rejeição estrita de strings compostas apenas por espaços em branco
 * 
 * Framework/Runtime: Node.js nativo com node:assert/strict
 */

import assert from "node:assert/strict";
import { createTaskSchema } from "../src/modules/tasks/tasks.schema.ts";

console.log("================================================================================");
console.log("🧪 FICHA PRÁTICA 4 — EXERCÍCIO 2: TESTES UNITÁRIOS DA REGRA DO TÍTULO DE TAREFA");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (error: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     └─ Erro: ${error.message}`);
    failedCount++;
  }
}

// -----------------------------------------------------------------------------
// GRUPO 1: CASOS VÁLIDOS (Happy Path & Higienização)
// -----------------------------------------------------------------------------
console.log("--------------------------------------------------------------------------------");
console.log("1. Casos Válidos (Títulos Nominais e Higienização de Espaços)");
console.log("--------------------------------------------------------------------------------");

runTest("TC-VAL-01: Título nominal comum de tamanho padrão é aceite", () => {
  const result = createTaskSchema.safeParse({
    title: "Implementar autenticação JWT no backend",
  });
  assert.equal(result.success, true, "Payload com título válido deve ser aceite");
  if (result.success) {
    assert.equal(result.data.title, "Implementar autenticação JWT no backend");
    assert.equal(result.data.status, "TODO", "Status default deve ser TODO");
    assert.equal(result.data.priority, "MEDIUM", "Prioridade default deve ser MEDIUM");
  }
});

runTest("TC-VAL-02: Título com espaços no início e no fim é higienizado pelo trim", () => {
  const result = createTaskSchema.safeParse({
    title: "   Criar testes unitários para a regra do título   ",
  });
  assert.equal(result.success, true, "Título com espaços nos extremos deve ser aceite");
  if (result.success) {
    assert.equal(
      result.data.title,
      "Criar testes unitários para a regra do título",
      "Espaços nos extremos devem ser removidos pelo trim"
    );
  }
});

runTest("TC-VAL-03: Título com pontuação e caracteres UTF-8 especiais é aceite", () => {
  const result = createTaskSchema.safeParse({
    title: "Refatoração & Análise de Métricas: Relatório #123 (Sprint 4)",
  });
  assert.equal(result.success, true, "Caracteres acentuados e pontuação válida devem ser aceites");
});

// -----------------------------------------------------------------------------
// GRUPO 2: CASOS INVÁLIDOS (Rejeição Defensiva)
// -----------------------------------------------------------------------------
console.log("\n--------------------------------------------------------------------------------");
console.log("2. Casos Inválidos (Strings Vazias, Apenas Espaços e Tipos Incorretos)");
console.log("--------------------------------------------------------------------------------");

runTest("TC-INV-01: Título completamente vazio ('') é rejeitado", () => {
  const result = createTaskSchema.safeParse({
    title: "",
  });
  assert.equal(result.success, false, "String vazia deve ser rejeitada");
  if (!result.success) {
    const titleError = result.error.errors.find((e) => e.path.includes("title"));
    assert.ok(titleError, "Deve conter erro no campo 'title'");
    assert.match(titleError.message, /pelo menos 3 carateres|pelo menos 3 caracteres/i);
  }
});

runTest("TC-INV-02: Título composto exclusivamente por espaços em branco é rejeitado (Anti-Espaços)", () => {
  const result = createTaskSchema.safeParse({
    title: "     ",
  });
  assert.equal(result.success, false, "String apenas com espaços deve ser rejeitada");
  if (!result.success) {
    const titleError = result.error.errors.find((e) => e.path.includes("title"));
    assert.ok(titleError, "Deve conter erro no campo 'title' após trim resultar em comprimento 0");
  }
});

runTest("TC-INV-03: Título composto por tabs e quebras de linha (' \\t \\n ') é rejeitado", () => {
  const result = createTaskSchema.safeParse({
    title: "  \t \n  \r\n  ",
  });
  assert.equal(result.success, false, "Whitespace complexo deve ser rejeitado");
});

runTest("TC-INV-04: Título ausente (undefined) é rejeitado com mensagem de obrigatoriedade", () => {
  const result = createTaskSchema.safeParse({});
  assert.equal(result.success, false, "Campo obrigatório em falta deve falhar");
  if (!result.success) {
    const titleError = result.error.errors.find((e) => e.path.includes("title"));
    assert.ok(titleError, "Deve existir erro no campo 'title'");
    assert.match(titleError.message, /obrigatório/i);
  }
});

runTest("TC-INV-05: Título com tipo não-string (número) é rejeitado", () => {
  const result = createTaskSchema.safeParse({
    title: 123456 as any,
  });
  assert.equal(result.success, false, "Número não pode ser aceite como título");
});

// -----------------------------------------------------------------------------
// GRUPO 3: ANÁLISE DE VALORES-LIMITE (Boundary Value Analysis - BVA)
// -----------------------------------------------------------------------------
console.log("\n--------------------------------------------------------------------------------");
console.log("3. Análise de Valores-Limite (BVA nos Limiares de 3 e 150 Caracteres)");
console.log("--------------------------------------------------------------------------------");

runTest("TC-BND-01: Limite inferior exato (exatamente 3 caracteres úteis) é ACEITE", () => {
  const result = createTaskSchema.safeParse({
    title: "Fix",
  });
  assert.equal(result.success, true, "Título com exatamente 3 caracteres deve ser aceite");
  if (result.success) {
    assert.equal(result.data.title, "Fix");
  }
});

runTest("TC-BND-02: Imediatamente abaixo do limite inferior (2 caracteres úteis: 'AB') é REJEITADO", () => {
  const result = createTaskSchema.safeParse({
    title: "AB",
  });
  assert.equal(result.success, false, "Título com 2 caracteres deve ser rejeitado");
  if (!result.success) {
    const titleError = result.error.errors.find((e) => e.path.includes("title"));
    assert.ok(titleError, "Deve falhar por ter menos de 3 caracteres");
  }
});

runTest("TC-BND-03: Imediatamente abaixo do limite inferior com espaços ('  ab  ') é REJEITADO", () => {
  // Nota crítica: O comprimento total da string original é 6 ('  ab  '),
  // mas o trim defensivo reduz para 2 caracteres úteis, devendo ser REJEITADO!
  const result = createTaskSchema.safeParse({
    title: "  ab  ",
  });
  assert.equal(
    result.success,
    false,
    "Título com 2 caracteres úteis após trim deve ser rejeitado mesmo que a string bruta tenha tamanho >= 3"
  );
});

runTest("TC-BND-04: Limite superior exato (exatamente 150 caracteres) é ACEITE", () => {
  const exactly150 = "T".repeat(150);
  const result = createTaskSchema.safeParse({
    title: exactly150,
  });
  assert.equal(result.success, true, "Título com exatamente 150 caracteres deve ser aceite");
  if (result.success) {
    assert.equal(result.data.title.length, 150);
  }
});

runTest("TC-BND-05: Imediatamente acima do limite superior (151 caracteres) é REJEITADO", () => {
  const exactly151 = "T".repeat(151);
  const result = createTaskSchema.safeParse({
    title: exactly151,
  });
  assert.equal(result.success, false, "Título com 151 caracteres deve ser rejeitado");
  if (!result.success) {
    const titleError = result.error.errors.find((e) => e.path.includes("title"));
    assert.ok(titleError, "Deve falhar por exceder 150 caracteres");
    assert.match(titleError.message, /não pode exceder 150|não pode ter mais de 150/i);
  }
});

// -----------------------------------------------------------------------------
// RESUMO DA EXECUÇÃO
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESUMO DA SUITE UNITÁRIA: ${passedCount} Passaram, ${failedCount} Falharam.`);
console.log("================================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
