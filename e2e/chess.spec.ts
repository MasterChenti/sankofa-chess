import { test, expect } from "@playwright/test";
import { move, signUpAndOnboard, tap } from "./helpers";

test("play the computer, resign, and get a coached review", async ({ page }) => {
  test.setTimeout(180_000);
  await signUpAndOnboard(page);
  await page.goto("/app/play");
  await page.getByTestId("tab-computer").click();
  await page.getByRole("button", { name: /Abena/ }).click();
  await page.getByRole("button", { name: "White", exact: true }).click();
  await page.getByRole("button", { name: "No clock" }).click();
  await page.getByTestId("start-game").click();

  // Tap-to-move shows legal targets, then plays.
  const board = page.getByTestId("chess-board").first();
  await tap(page, "play-board", "e2");
  await tap(page, "play-board", "e4");
  // Wait for the computer's reply: White to move on move 2.
  await expect(board).toHaveAttribute("data-fen", / w \S+ \S+ \d+ 2$/, { timeout: 30_000 });
  await move(page, "play-board", "g1", "f3");
  await expect(board).toHaveAttribute("data-fen", / w \S+ \S+ \d+ 3$/, { timeout: 30_000 });
  await expect(page.getByTestId("game-status")).toHaveText("Your move.");
  await page.screenshot({ path: "test-results/screens/04-game.png", fullPage: true });

  // An illegal move is ignored.
  await move(page, "play-board", "a1", "a5");
  await expect(page.getByRole("list", { name: "Moves" })).toContainText("Nf3");

  await page.getByRole("button", { name: "Resign" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Resign" }).click();

  const result = page.getByTestId("result-dialog");
  await expect(result).toBeVisible();
  await expect(result).toContainText("You lost.");
  await expect(result.getByRole("button", { name: "Review with the coach" })).toBeEnabled({ timeout: 20_000 });
  await page.screenshot({ path: "test-results/screens/05-result.png" });
  await result.getByRole("button", { name: "Review with the coach" }).click();

  await expect(page).toHaveURL(/\/app\/play\/[0-9a-f-]{36}/);
  // "Think first": when the coach asks what went wrong, answer before it reveals.
  await expect(page.getByTestId("think-first").or(page.getByTestId("biggest-lesson")).first()).toBeVisible({ timeout: 90_000 });
  if (await page.getByTestId("think-first").isVisible()) await page.getByRole("button", { name: "I’m not sure: show me" }).click();
  await expect(page.getByTestId("biggest-lesson")).toBeVisible();
  await page.getByRole("button", { name: "Why was my worst move bad?" }).click();
  await expect(page.getByTestId("coach-chat").locator("p")).toHaveCount(3, { timeout: 30_000 });
  await page.screenshot({ path: "test-results/screens/06-review.png", fullPage: true });

  // The game shows up on the profile, with stats updated.
  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: "Recent games" })).toBeVisible();
  await expect(page.getByText(/Loss vs Abena/i)).toBeVisible();
});

test("pass and play supports two players on one device", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/app/play?tab=computer");
  await page.getByRole("button", { name: /Pass & play/ }).click();
  await page.getByRole("button", { name: "No clock" }).click();
  await page.getByTestId("start-game").click();
  // Fool's mate — checkmate ends the game on its own.
  await move(page, "play-board", "f2", "f3");
  await move(page, "play-board", "e7", "e5");
  await move(page, "play-board", "g2", "g4");
  await move(page, "play-board", "d8", "h4");
  await expect(page.getByTestId("game-status")).toHaveText("Black wins by checkmate.");
  await expect(page.getByTestId("result-dialog")).toContainText("Unrated game", { timeout: 20_000 });
});
