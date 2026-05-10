import { expect, test } from "@playwright/test";

test("login por URL autocompleta slug y autentica", async ({ page }) => {
  const baseUrl = "http://192.168.1.104:3000";

  const lookupResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/proxy/api/v1/auth/lookup-email") &&
      response.request().method() === "POST",
    { timeout: 15000 },
  );

  await page.goto(
    `${baseUrl}/login?email=owner%40elmaestro.com&slug=&password=Admin123%21`,
    { waitUntil: "domcontentloaded" },
  );

  const emailInput = page.locator("#email");
  const slugInput = page.locator("#slug");
  const passwordInput = page.locator("#password");

  await expect(emailInput).toHaveValue("owner@elmaestro.com");
  await expect(passwordInput).toHaveValue("Admin123!");

  const lookupResponse = await lookupResponsePromise;
  expect(lookupResponse.status(), "lookup-email no respondió OK").toBeLessThan(400);

  await expect(slugInput).not.toHaveValue("", { timeout: 15000 });
  await expect(slugInput).toHaveValue("el-maestro", { timeout: 15000 });

  const authResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/callback/credentials") &&
      response.request().method() === "POST",
    { timeout: 15000 },
  );

  await page.getByRole("button", { name: "Entrar" }).click();

  const authResponse = await authResponsePromise;
  expect(authResponse.status(), "callback de credenciales devolvió error").toBeLessThan(400);

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await expect(page).toHaveURL(/\/$/);
});
