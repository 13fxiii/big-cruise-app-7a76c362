import { expect, test } from 'playwright/test';

test.describe('BIG CRUISE live smoke', () => {
  test('home exposes the core product lanes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('a[href="/play"]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a[href="/merch"]').first()).toBeVisible();
    await expect(page.locator('a[href="/profile"]').first()).toBeVisible();
  });

  test('games lobby exposes all ten games', async ({ page }) => {
    await page.goto('/play', { waitUntil: 'networkidle' });
    for (const name of [
      'Codenames',
      'Word Guess',
      'Draw It Out',
      'UNO',
      'Ludo',
      'Werewolf',
      'Chess',
      'Karaoke',
      'Truth or Dare',
      'Kahoot',
    ]) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    }
  });

  test('merch page loads', async ({ page }) => {
    await page.goto('/merch', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/Dominion State|Merch|Lookbook|Drop/i);
  });

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/BIG CRUISE ID|Profile|CRUISE|BCH/i);
  });
});
