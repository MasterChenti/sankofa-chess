import { test, expect, type Page } from "@playwright/test";
import { Chess } from "chess.js";
import { move, signUpAndOnboard } from "./helpers";

/**
 * Computer mode must behave like a real opponent: the player never moves for it.
 * These run on Chromium (Pixel 7) and on WebKit with an iPhone profile (Safari's engine).
 */

const board = (page: Page) => page.getByTestId("chess-board").first();
const fenOf = async (page: Page) => (await board(page).getAttribute("data-fen")) ?? "";

async function startComputerGame(page: Page, opts: { persona: RegExp; color: "White" | "Black"; clock?: string }) {
  await page.goto("/app/play?tab=computer");
  await page.getByRole("button", { name: opts.persona }).click();
  await page.getByRole("button", { name: opts.color, exact: true }).click();
  await page.getByRole("button", { name: opts.clock ?? "No clock" }).click();
  await page.getByTestId("start-game").click();
  await expect(page.getByTestId("game-status")).toBeVisible();
}

/** Waits until it's our turn (the computer has replied on its own), then plays a legal move. */
async function playOneMove(page: Page, me: "w" | "b") {
  await expect(board(page)).toHaveAttribute("data-fen", new RegExp(` ${me} `), { timeout: 30_000 });
  await expect(page.getByTestId("game-status")).not.toHaveText(/thinking/);
  const g = new Chess(await fenOf(page));
  const moves = g.moves({ verbose: true }).filter((m) => !m.promotion);
  // Prefer quiet developing moves so the game lasts; any legal move is fine.
  const pick = moves.find((m) => !m.captured && "nbp".includes(m.piece)) ?? moves[0];
  await move(page, "play-board", pick.from, pick.to);
  await expect(board(page)).not.toHaveAttribute("data-fen", g.fen(), { timeout: 10_000 });
}

test("Test A + B: the computer answers every move by itself for ten plies", async ({ page }) => {
  test.setTimeout(180_000);
  await signUpAndOnboard(page);
  await startComputerGame(page, { persona: /Abena/, color: "White" });

  await move(page, "play-board", "e2", "e4");
  // Test A: a legal reply arrives without any further tap.
  await expect(board(page)).toHaveAttribute("data-fen", / w \S+ \S+ \d+ 2$/, { timeout: 30_000 });
  await expect(page.getByTestId("game-status")).toHaveText("Your move.");

  // Test B: four more of our moves → ten plies, and the computer made all of its own.
  for (let i = 0; i < 4; i++) await playOneMove(page, "w");
  await expect(board(page)).toHaveAttribute("data-fen", / w \S+ \S+ \d+ 6$/, { timeout: 30_000 });
  await expect(page.getByRole("list", { name: "Moves" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.getByTestId("engine-error")).toHaveCount(0);
  await page.screenshot({ path: `test-results/screens/20-computer-ten-plies-${test.info().project.name}.png`, fullPage: true });
});

test("Test C: playing Black, the computer opens as White on its own", async ({ page }) => {
  test.setTimeout(150_000);
  await signUpAndOnboard(page);
  await startComputerGame(page, { persona: /Kwaku/, color: "Black" });
  // No tap from us: White's first move appears.
  await expect(board(page)).toHaveAttribute("data-fen", / b \S+ \S+ \d+ 1$/, { timeout: 30_000 });
  await expect(page.getByTestId("game-status")).toHaveText("Your move.");
  for (let i = 0; i < 3; i++) await playOneMove(page, "b");
  await expect(board(page)).toHaveAttribute("data-fen", / b \S+ \S+ \d+ 4$/, { timeout: 30_000 });
});

test("Test E: checkmate ends the game and the computer makes no further move", async ({ page }) => {
  await signUpAndOnboard(page);
  // A saved game (the app restores unfinished games): White to play Qxf7#.
  await page.goto("/app/play?tab=computer");
  await page.evaluate(() => {
    localStorage.setItem(
      "sankofa.active-game.v1",
      JSON.stringify({
        id: "e2e-mate",
        mode: "ai",
        personaId: "nana",
        userColor: "w",
        timeControl: "none",
        moves: ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6"],
        clocks: { w: null, b: null },
        turnStartedAt: null,
        end: null,
      }),
    );
  });
  await page.reload();
  await expect(page.getByTestId("game-status")).toHaveText("Your move.");
  await move(page, "play-board", "h5", "f7");
  await expect(page.getByTestId("game-status")).toHaveText("White wins by checkmate.");
  const finalFen = await fenOf(page);
  await page.waitForTimeout(2500);
  expect(await fenOf(page)).toBe(finalFen);
  await expect(page.getByRole("list", { name: "Moves" })).toContainText("Qxf7#");
  await expect(page.getByTestId("result-dialog")).toContainText("You won.", { timeout: 20_000 });
});

test("Test F: a new game never receives a reply meant for the previous one", async ({ page }) => {
  test.setTimeout(150_000);
  await signUpAndOnboard(page);
  await startComputerGame(page, { persona: /Abena/, color: "White" });
  await move(page, "play-board", "e2", "e4");
  await expect(board(page)).toHaveAttribute("data-fen", / w \S+ \S+ \d+ 2$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Resign" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Resign" }).click();
  await page.getByTestId("result-dialog").getByRole("button", { name: "Play again" }).click();

  await startComputerGame(page, { persona: /Abena/, color: "Black" });
  await expect(board(page)).toHaveAttribute("data-fen", / b \S+ \S+ \d+ 1$/, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  // Exactly one move (the computer's opening move) — nothing from the old game slipped in.
  await expect(page.getByRole("list", { name: "Moves" }).getByRole("listitem")).toHaveCount(1);
  await expect(board(page)).toHaveAttribute("data-fen", / b \S+ \S+ \d+ 1$/);
});

test("Test I: if Stockfish can't load, the player is told and the computer still plays", async ({ page }) => {
  await page.route("**/stockfish/sf-lite.js", (route) => route.abort());
  await signUpAndOnboard(page);
  await startComputerGame(page, { persona: /Abena/, color: "White" });
  await move(page, "play-board", "d2", "d4");
  await expect(board(page)).toHaveAttribute("data-fen", / w \S+ \S+ \d+ 2$/, { timeout: 30_000 });
  await expect(page.getByTestId("engine-fallback-note")).toBeVisible();
  await expect(page.getByTestId("engine-fallback-note")).toContainText("Try Stockfish again");
});
