import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.describe("Fluxo E2E: Autenticação, Abertura de Projeto, Criação e Verificação de Tarefa", () => {
  const uniqueTaskTitle = `Tarefa E2E Playwright ${Date.now()}`;
  let createdTaskId: string | null = null;

  test.afterAll(async () => {
    // Teardown: Garantir a limpeza da tarefa criada durante o teste E2E
    try {
      if (uniqueTaskTitle) {
        await prisma.task.deleteMany({
          where: { title: uniqueTaskTitle },
        });
        console.log(`🧹 Teardown E2E: Tarefa '${uniqueTaskTitle}' removida da base de dados.`);
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("Deve autenticar como Gestor, navegar para Tarefas, criar uma nova tarefa e validá-la na listagem", async ({
    page,
  }) => {
    // 1. Navegar para a página de login
    await page.goto("/login");
    await expect(page).toHaveTitle(/Matriz/i);

    // 2. Autenticar no sistema com as credenciais do Gestor de Projeto (Luís Ferreira)
    // Usamos os inputs reais do formulário
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole("button", { name: /Entrar no Sistema/i });

    await emailInput.fill("luis.ferreira@matriz.local");
    await passwordInput.fill("password123");
    await submitBtn.click();

    // 3. Aguardar redirecionamento para o dashboard principal
    await page.waitForURL("/", { timeout: 10000 });

    // Confirmar que o utilizador autenticado é apresentado na barra superior
    await expect(page.getByText("Luís Ferreira").first()).toBeVisible();
    await expect(page.getByText("Gestor").first()).toBeVisible();

    // 4. Navegar para o ecrã de Tarefas através da TopBar
    const tasksTabBtn = page.getByRole("button", { name: "Tarefas" });
    await tasksTabBtn.click();

    // 5. Clicar no botão "Nova Tarefa" para abrir o modal de registo
    const newTaskBtn = page.getByRole("button", { name: /Nova Tarefa/i }).first();
    await expect(newTaskBtn).toBeVisible({ timeout: 10000 });
    await newTaskBtn.click();

    // 6. Validar a abertura do modal de criação de tarefa
    const modalHeading = page.getByRole("heading", { name: "Nova Tarefa" });
    await expect(modalHeading).toBeVisible();

    // 7. Preencher o formulário da tarefa com dados válidos (escopado no modal/form)
    const modalForm = page.locator("form").filter({ hasText: "Título da Tarefa" });
    await expect(modalForm).toBeVisible();

    const titleInput = modalForm.locator('input[type="text"]');
    const descTextarea = modalForm.locator("textarea");

    await titleInput.fill(uniqueTaskTitle);
    await descTextarea.fill("Tarefa criada automaticamente através da suite End-to-End com Playwright.");

    // Selecionar prioridade "Alta (HIGH)" dentro do formulário do modal
    const prioritySelect = modalForm.locator("select").first();
    await prioritySelect.selectOption("HIGH");

    // 8. Submeter o formulário de criação
    const confirmCreateBtn = modalForm.locator('button[type="submit"]');
    await confirmCreateBtn.click();

    // 9. Confirmar que o modal fecha após submissão bem-sucedida
    await expect(modalHeading).not.toBeVisible({ timeout: 10000 });

    // 10. Verificar que a nova tarefa aparece renderizada na listagem sem recarregamento
    // (Utilizamos getByRole heading para selecionar especificamente o card da tarefa na listagem)
    const taskHeadingElement = page.getByRole("heading", { name: uniqueTaskTitle });
    await expect(taskHeadingElement).toBeVisible({ timeout: 10000 });

    // Confirmar que o card da tarefa exibe a badge de prioridade "Alta" e o estado inicial "A Fazer"
    const taskContainer = page.locator("div.border").filter({ has: taskHeadingElement }).first();
    await expect(taskContainer).toBeVisible();
    await expect(taskContainer.getByText("Prioridade: Alta")).toBeVisible();
    await expect(taskContainer.getByText("A Fazer")).toBeVisible();

    // 11. Validação complementar: Confirmar persistência direta no SQLite
    const persistedTask = await prisma.task.findFirst({
      where: { title: uniqueTaskTitle },
    });
    expect(persistedTask).not.toBeNull();
    expect(persistedTask?.status).toBe("TODO");
    expect(persistedTask?.priority).toBe("HIGH");

    if (persistedTask) {
      createdTaskId = persistedTask.id;
    }
  });
});
