import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill("owner@elmaestro.com");
  await page.locator("#slug").fill("el-maestro");
  await page.locator("#password").fill("Admin123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
}

test("desktop sidebar se adapta y no genera overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator("aside")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasHorizontalOverflow).toBeFalsy();
});

test("tablet usa navegación móvil y abre/cierra sidebar móvil", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await login(page);

  const mobileMenuButton = page.locator("button:has(.lucide-menu)");
  await expect(mobileMenuButton).toBeVisible();
  await mobileMenuButton.click();

  const panel = page.locator("div.z-\\[101\\]");
  await expect(panel.getByRole("link", { name: /configura/i }).first()).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
});

test("mobile sidebar se renderiza dentro del viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const mobileMenuButton = page.locator("button:has(.lucide-menu)");
  await mobileMenuButton.click();

  const panel = page.locator("div.z-\\[101\\]");
  await expect(panel).toBeVisible();

  const withinViewport = await panel.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= window.innerWidth + 1;
  });
  expect(withinViewport).toBeTruthy();
});
