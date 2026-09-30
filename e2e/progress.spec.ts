import { test, expect } from "@playwright/test";
import { move, signUpAndOnboard } from "./helpers";

test("puzzles: wrong answer, retry, correct answer and progress", async ({ page }) => {
  await signUpAndOnboard(page);

  await page.goto("/app/puzzles/back-rank");
  await expect(page.getByTestId("puzzle-feedback")).toHaveText("Your move.");
  await move(page, "puzzle-board", "d1", "d7");
  await expect(page.getByTestId("puzzle-feedback")).toHaveText("Not quite. Look for the opponent’s defensive resource.");
  await page.getByTestId("puzzle-retry").click();
  await move(page, "puzzle-board", "d1", "d8");
  await expect(page.getByTestId("puzzle-feedback")).toHaveText("Excellent. You saw the tactic.");
  await expect(page.getByTestId("puzzle-feedback")).toHaveAttribute("data-saving", "false");
  await page.screenshot({ path: "test-results/screens/07-puzzle.png", fullPage: true });

  // Multi-move puzzle with an automatic reply.
  await page.goto("/app/puzzles/royal-fork");
  await move(page, "puzzle-board", "b5", "c7");
  await expect(page.getByTestId("puzzle-feedback")).toHaveText("Good — keep going.");
  await page.waitForTimeout(900);
  await move(page, "puzzle-board", "c7", "a8");
  await expect(page.getByTestId("puzzle-feedback")).toHaveText("Excellent. You saw the tactic.");
  await expect(page.getByTestId("puzzle-feedback")).toHaveAttribute("data-saving", "false");

  await page.goto("/app/home");
  await expect(page.getByTestId("daily-progress")).toHaveText("2 / 3");

  await page.goto("/app/puzzles");
  await expect(page.getByText("2/11")).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible(); // first-try accuracy: 1 of 2
});

test("learning: complete a lesson and keep the progress", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/app/learn/castling");
  await expect(page.getByRole("heading", { name: "Castling" })).toBeVisible();
  await move(page, "lesson-board", "h2", "h3");
  await expect(page.getByTestId("lesson-feedback")).toContainText("Not this time");
  await page.getByRole("button", { name: "Try again" }).click();
  await move(page, "lesson-board", "e1", "g1");
  await expect(page.getByTestId("lesson-feedback")).toHaveText("Lesson complete. That idea is yours now.");
  await page.screenshot({ path: "test-results/screens/08-lesson.png", fullPage: true });

  await page.reload();
  await expect(page.getByTestId("lesson-complete-badge")).toBeVisible();

  await page.goto("/app/profile");
  await expect(page.getByText("1/21")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/09-profile.png", fullPage: true });

  await page.goto("/app/challenges");
  await expect(page.getByRole("heading", { name: "Complete 2 lessons" })).toBeVisible();
  await page.screenshot({ path: "test-results/screens/10-challenges.png", fullPage: true });

  await page.goto("/app/stories/go-back-and-get-it");
  await expect(page.getByRole("heading", { name: "Go back and get it" })).toBeVisible();
  await page.screenshot({ path: "test-results/screens/11-story.png", fullPage: true });
});
