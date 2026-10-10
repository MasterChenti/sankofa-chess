import { test, expect } from "@playwright/test";
import { signUpAndOnboard } from "./helpers";

test("today: the finite daily session from first move to “you’ve sharpened your mind”", async ({ page }) => {
  test.setTimeout(150_000);
  const user = await signUpAndOnboard(page);
  await expect(page.getByTestId("home-greeting")).toContainText(user.name);
  await expect(page.getByTestId("today-status")).toContainText("minutes");
  await page.screenshot({ path: "test-results/screens/12-today.png", fullPage: true });

  await page.getByTestId("start-morning").click();

  // MOVE: reveal counts (honesty over pressure); the step then moves on.
  await page.getByRole("button", { name: "Show solution" }).click();
  await expect(page.getByTestId("puzzle-feedback")).toHaveAttribute("data-saving", "false");
  await page.getByTestId("step-continue").click();

  // REMEMBER: the story unfolds, then asks what you would do before telling you what happened.
  await expect(page.getByTestId("story")).toBeVisible();
  for (let i = 0; i < 6 && (await page.getByTestId("story-continue").isVisible()); i++) await page.getByTestId("story-continue").click();
  await page.locator('[data-testid^="story-option-"]').first().click();
  await expect(page.getByTestId("story-sankofa")).toBeVisible();
  await page.screenshot({ path: "test-results/screens/13-story.png", fullPage: true });
  await page.getByTestId("step-continue").click();

  // THINK: no wrong answer, a perspective on each option.
  await expect(page.getByTestId("thought")).toBeVisible();
  await page.locator('[data-testid^="thought-option-"]').first().click();
  await expect(page.getByTestId("thought-takeaway")).toBeVisible();
  await page.getByTestId("step-continue").click();

  // PLAY is a bonus: it can be skipped without breaking the day.
  await expect(page.getByTestId("play-step")).toBeVisible();
  await expect(page.getByTestId("online-count")).toBeVisible();
  await page.getByTestId("skip-play").click();

  // REFLECT closes the session.
  await expect(page.getByTestId("reflection")).toBeVisible();
  await page.getByRole("radio").first().click();
  await page.getByRole("textbox").fill("Check what my opponent wants before I attack.");
  await page.getByTestId("save-reflection").click();

  await expect(page.getByTestId("session-done")).toContainText("You’ve sharpened your mind for today.");
  await page.screenshot({ path: "test-results/screens/14-done.png", fullPage: true });

  await page.goto("/app/today");
  await expect(page.getByTestId("today-done")).toBeVisible();
  await expect(page.getByTestId("today-step-reflect")).toHaveAttribute("data-done", "true");

  await page.goto("/app/profile");
  await expect(page.getByText("Check what my opponent wants before I attack.")).toBeVisible();
});

test("discover and think are explorable outside the daily session", async ({ page }) => {
  await signUpAndOnboard(page);
  await page.goto("/app/discover");
  await expect(page.getByTestId("discover-today")).toBeVisible();
  await page.getByRole("link", { name: /^West Africa \d+$/ }).click();
  await expect(page).toHaveURL(/region=west/);
  await page.screenshot({ path: "test-results/screens/15-discover.png", fullPage: true });

  await page.goto("/app/think");
  await expect(page.getByRole("heading", { name: "Strategic questions" })).toBeVisible();
  await expect(page.getByTestId("think-today-puzzle")).toBeVisible();
});
