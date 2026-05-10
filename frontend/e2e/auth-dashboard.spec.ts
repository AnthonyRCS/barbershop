import { expect, Page, test } from "@playwright/test";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill("owner@elmaestro.com");
  const slugInput = page.locator("#slug");
  try {
    await expect(slugInput).toHaveValue("el-maestro", { timeout: 5000 });
  } catch {
    await slugInput.fill("el-maestro");
  }
  await page.locator("#password").fill("Admin123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
}

test("login y carga dashboard", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Citas Hoy", { exact: true })).toBeVisible();
  await expect(page.getByText("Completadas", { exact: true })).toBeVisible();
  await expect(page.getByText("Pendientes", { exact: true })).toBeVisible();
  await expect(page.getByText("Ingresos (S/)", { exact: true })).toBeVisible();
});

test("navegacion modulos principales", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: "Citas" }).click();
  await expect(page.getByRole("heading", { name: "Citas" })).toBeVisible({ timeout: 8000 });

  await page.getByRole("link", { name: "Clientes" }).click();
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible({ timeout: 8000 });

  await page.getByRole("link", { name: "Barberos" }).click();
  await expect(page.getByRole("heading", { name: "Barberos" })).toBeVisible({ timeout: 8000 });

  await page.getByRole("link", { name: "Servicios" }).click();
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible({ timeout: 8000 });
});

test("redirige a login si no hay sesion", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("/login", { timeout: 8000 });
  await expect(page.getByRole("heading", { name: /Iniciar sesi[oó]n/i })).toBeVisible();
});

test("logout regresa al login", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /salir|cerrar sesi[oó]n/i }).first().click();
  await page.waitForURL("/login", { timeout: 8000 });
  await expect(page.getByRole("heading", { name: /Iniciar sesi[oó]n/i })).toBeVisible();
});
