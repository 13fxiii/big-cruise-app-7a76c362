import { expect, test, type BrowserContext, type Page } from 'playwright/test';

const emailA = process.env.E2E_UNO_EMAIL_A;
const passwordA = process.env.E2E_UNO_PASSWORD_A;
const emailB = process.env.E2E_UNO_EMAIL_B;
const passwordB = process.env.E2E_UNO_PASSWORD_B;

test.describe('UNO authenticated multiplayer', () => {
  test.skip(!emailA || !passwordA || !emailB || !passwordB, 'Set E2E_UNO_EMAIL_A/PASSWORD_A and E2E_UNO_EMAIL_B/PASSWORD_B for the live two-browser gate.');

  async function signIn(page: Page, email: string, password: string) {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Walk in' }).click();
    await page.waitForURL(/\/$/);
  }

  async function openRoom(context: BrowserContext, email: string, password: string, room: string) {
    const page = await context.newPage();
    await signIn(page, email, password);
    await page.goto(`/play/uno?room=${encodeURIComponent(room)}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('WAITING', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/players · (host|player)/i)).toBeVisible({ timeout: 15000 });
    return page;
  }

  test('two authenticated browsers share one authoritative room and private hands', async ({ browser }) => {
    const room = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await openRoom(contextA, emailA!, passwordA!, room);
      const pageB = await openRoom(contextB, emailB!, passwordB!, room);
      await expect(pageA.getByText(/2 players · host/i)).toBeVisible({ timeout: 10000 });
      await expect(pageB.getByText(/2 players · player/i)).toBeVisible({ timeout: 10000 });
      await pageA.getByRole('button', { name: 'Ready' }).click();
      await pageB.getByRole('button', { name: 'Ready' }).click();
      await expect(pageA.getByText('READY', { exact: true }).first()).toBeVisible({ timeout: 10000 });
      await expect(pageB.getByText('READY', { exact: true }).first()).toBeVisible({ timeout: 10000 });
      await pageA.getByRole('button', { name: 'Start game' }).click();
      await expect(pageA.getByText('PLAYING', { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(pageB.getByText('PLAYING', { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(pageA.locator('button[aria-label^="UNO "]')).toHaveCount(7, { timeout: 10000 });
      await expect(pageB.locator('button[aria-label^="UNO "]')).toHaveCount(7, { timeout: 10000 });
      await expect(pageA.getByLabel('Hidden UNO card')).toHaveCount(7, { timeout: 10000 });
      await expect(pageB.getByLabel('Hidden UNO card')).toHaveCount(7, { timeout: 10000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
