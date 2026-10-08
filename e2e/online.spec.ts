import { test, expect, type Page } from "@playwright/test";
import { move, signUpAndOnboard } from "./helpers";

async function plies(page: Page) {
  const fen = (await page.getByTestId("chess-board").first().getAttribute("data-fen")) ?? "";
  return fen;
}

test("two real players: invite by link, play, and the result reaches both", async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signUpAndOnboard(a);
  await signUpAndOnboard(b);

  // A creates an invite link (the same link they would share on WhatsApp).
  await a.goto("/app/play?tab=people");
  await a.getByTestId("invite-friend").click();
  const link = (await a.getByTestId("invite-link").textContent())!.trim();
  const path = new URL(link).pathname;
  await a.getByRole("link", { name: "Open the game board" }).click();
  await expect(a.getByTestId("live-status")).toHaveText("Waiting for your friend to join…");

  // B opens the link and accepts.
  await b.goto(path);
  await b.getByTestId("accept-challenge").click();
  await expect(b).toHaveURL(/\/app\/play\/live\//);
  await expect(a.getByTestId("live-status")).not.toHaveText("Waiting for your friend to join…", { timeout: 30_000 });

  const aColor = await a.locator("[data-my-color]").getAttribute("data-my-color");
  const [white, black] = aColor === "w" ? [a, b] : [b, a];
  const board = (p: Page) => p.getByTestId("chess-board").first();

  // Fool's mate, each move made on its owner's screen and seen on the other.
  const line: [Page, string, string][] = [
    [white, "f2", "f3"],
    [black, "e7", "e5"],
    [white, "g2", "g4"],
    [black, "d8", "h4"],
  ];
  for (const [p, from, to] of line) {
    const other = p === white ? black : white;
    await expect(p.getByTestId("live-status")).toHaveText(/Your move/, { timeout: 30_000 });
    const before = await plies(other);
    await move(p, "live-board", from, to);
    await expect(board(other)).not.toHaveAttribute("data-fen", before, { timeout: 30_000 });
  }

  await expect(white.getByTestId("live-status")).toHaveText("Black wins by checkmate.", { timeout: 30_000 });
  await expect(black.getByTestId("live-result")).toContainText("You won.");
  await expect(white.getByTestId("live-result")).toContainText("You learned something.");
  await expect(black.getByRole("link", { name: "Review with the coach" })).toBeVisible({ timeout: 30_000 });
  await black.screenshot({ path: "test-results/screens/16-online-result.png", fullPage: true });
});

test("matchmaking pairs two players searching at the same time", async ({ browser }) => {
  test.setTimeout(200_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signUpAndOnboard(a);
  await signUpAndOnboard(b);

  await a.goto("/app/play?tab=people&mode=blitz&auto=1");
  await expect(a.getByTestId("searching")).toBeVisible();
  await b.goto("/app/play?tab=people&mode=blitz&auto=1");

  await expect(a).toHaveURL(/\/app\/play\/live\//, { timeout: 30_000 });
  await expect(b).toHaveURL(/\/app\/play\/live\//, { timeout: 30_000 });
  expect(new URL(a.url()).pathname).toBe(new URL(b.url()).pathname);

  // Before two moves, either player can abort without a rating change.
  await a.getByRole("button", { name: "Abort" }).click();
  await expect(a.getByTestId("live-result")).toContainText("Aborted.");
  await expect(b.getByTestId("live-result")).toContainText("Aborted.", { timeout: 30_000 });
});
