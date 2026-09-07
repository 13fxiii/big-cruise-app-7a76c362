import { expect, test } from 'playwright/test';

const games = [
  'codenames',
  'word-guess',
  'draw',
  'uno',
  'ludo',
  'werewolf',
  'chess',
  'karaoke',
  'truth',
  'kahoot',
] as const;

test.describe('BIG CRUISE launch regressions', () => {
  test('home and play expose the active Weekly Theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region')).toContainText('Weekly Theme');
    await expect(page.getByRole('heading', { name: /Too Lit To Stress|Weekly Theme/ })).toBeVisible();

    await page.goto('/play');
    await expect(page.getByRole('region')).toContainText('Challenge:');
  });

  test('long-form public game URLs resolve to canonical routes', async ({ page }) => {
    await page.goto('/play/draw-it-out');
    await expect(page).toHaveURL(/\/play\/draw$/);

    await page.goto('/play/truth-or-dare');
    await expect(page).toHaveURL(/\/play\/truth$/);
  });

  test('mode selection is announced and a game can start', async ({ page }) => {
    await page.goto('/play/codenames');
    await page.getByRole('button', { name: 'Pass the phone' }).click();
    await expect(page.getByText('Selected: Pass the phone.')).toBeVisible();
    await page.getByRole('button', { name: 'Sit down' }).click();
    await expect(page.getByRole('button', { name: 'Sit down' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pass' })).toBeVisible();
  });

  test('all ten canonical game routes render an entry screen', async ({ page }) => {
    for (const slug of games) {
      await page.goto(`/play/${slug}`);
      await expect(page.locator('body')).not.toContainText('That room is closed.');
      await expect(page.getByRole('button', { name: 'Sit down' })).toBeVisible();
    }
  });

  test('every canonical game can leave Sit Down into active play', async ({ page }) => {
    for (const slug of games) {
      await page.goto(`/play/${slug}`);
      const sit = page.getByRole('button', { name: 'Sit down' });
      await expect(sit).toBeVisible();
      // Prefer offline modes so the entry test does not depend on P2P peers.
      const bots = page.getByRole('button', { name: 'Vs bots' });
      const pass = page.getByRole('button', { name: 'Pass the phone' });
      if (await bots.count()) {
        await bots.click();
      } else if (await pass.count()) {
        await pass.click();
      }
      await sit.click();
      await expect(sit, `Sit down stuck on /play/${slug}`).toHaveCount(0, { timeout: 8000 });
    }
  });

  test('play lobby has no page-level horizontal overflow on iPhone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/play');
    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
    expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport);
  });
});
