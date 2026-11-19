import { test, expect } from "@playwright/test";
import path from "path";

test("Capturar screenshots da identidade visual de aviação", async ({ page }) => {
  const screenshotsDir = path.resolve(__dirname, "../../docs/ui/screenshots");

  // 1. Screenshot: Página de Login (Cockpit Hero)
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: path.join(screenshotsDir, "01-login-cockpit.png"),
    fullPage: true,
  });

  // 2. Autenticar como Gestor (Comandante da Torre)
  await page.locator('input[type="email"]').fill("luis.ferreira@matriz.local");
  await page.locator('input[type="password"]').fill("password123");
  await page.getByRole("button", { name: /Entrar no Sistema/i }).click();
  await page.waitForURL("/", { timeout: 10000 });
  await page.waitForLoadState("networkidle");

  // 2. Screenshot: Torre de Controlo (Dashboard)
  await page.screenshot({
    path: path.join(screenshotsDir, "02-dashboard-torre-controlo.png"),
    fullPage: true,
  });

  // 3. Screenshot: Esquadrão de Missões (Projetos)
  const projectsBtn = page.getByTestId("nav-projects");
  await projectsBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(screenshotsDir, "03-missoes-esquadrao.png"),
    fullPage: true,
  });

  // 4. Screenshot: Checklists de Voo & Hangar (Tarefas)
  const tasksBtn = page.getByTestId("nav-tasks");
  await tasksBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(screenshotsDir, "04-checklists-voo.png"),
    fullPage: true,
  });
});
