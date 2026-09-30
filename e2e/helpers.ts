import { expect, type Page } from "@playwright/test";

export function uniqueUser() {
  const n = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  return { name: "Ama", username: `ama_${n}`.slice(0, 20), email: `ama+${n}@example.com`, password: "sankofa-test-123" };
}

export async function signUpAndOnboard(page: Page, user = uniqueUser()) {
  await page.goto("/signup");
  await page.getByLabel("First name").fill(user.name);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByLabel("Country").selectOption("GH");
  await page.getByRole("button", { name: "intermediate" }).click();
  await page.getByTestId("signup-submit").click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByTestId("onboarding-next").click();
  await page.getByRole("button", { name: /Intermediate/ }).click();
  await page.getByTestId("onboarding-next").click();
  await page.getByRole("button", { name: /Improve tactics/ }).click();
  await page.getByTestId("onboarding-next").click();
  await page.getByTestId("onboarding-finish").click();
  await expect(page).toHaveURL(/\/app\/home/);
  return user;
}

/** Tap a square on a react-chessboard instance (tap-to-move). */
export async function tap(page: Page, boardId: string, square: string) {
  await page.locator(`#${boardId}-square-${square}`).click();
}

export async function move(page: Page, boardId: string, from: string, to: string) {
  await tap(page, boardId, from);
  await tap(page, boardId, to);
}
