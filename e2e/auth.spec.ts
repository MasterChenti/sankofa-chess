import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

test("landing page explains the product and leads to sign-up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn from the past. Master your next move.");
  await expect(page.getByRole("heading", { name: "Why Sankofa?" })).toBeVisible();
  await page.screenshot({ path: "test-results/screens/01-landing.png", fullPage: true });
  await page.getByRole("link", { name: "Join", exact: true }).click();
  await expect(page).toHaveURL(/\/signup/);
});

test("sign-up validation shows helpful errors", async ({ page }) => {
  await page.goto("/signup");
  await page.getByTestId("signup-submit").click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Choose your chess experience.")).toBeVisible();
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/app/today");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("sign up, onboard, log out and log back in", async ({ page }) => {
  const user = await signUpAndOnboard(page);
  await expect(page.getByTestId("home-greeting")).toContainText(`, ${user.name}.`);
  await page.screenshot({ path: "test-results/screens/02-home.png", fullPage: true });

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByTestId("login-submit").click();
  await expect(page.getByText("That email and password don’t match an account.")).toBeVisible();

  await page.getByLabel("Password").fill(user.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/app\/today/);
  await expect(page.getByTestId("home-greeting")).toContainText(user.name);
});

test("the seeded demo account can log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@sankofachess.app");
  await page.getByLabel("Password").fill("sankofa-demo-2026");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/app\/today/);
  await page.goto("/app/leaderboard");
  await expect(page).toHaveURL(/\/app\/community/);
  await expect(page.getByRole("cell", { name: /kwame_opens/ })).toBeVisible();
  await page.getByRole("link", { name: "Countries" }).click();
  await expect(page.getByTestId("countries-table")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/03-leaderboard.png", fullPage: true });
});
