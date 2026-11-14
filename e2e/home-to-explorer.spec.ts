import { test, expect } from '@playwright/test';

test.describe('E2E User Journey: Home to Explorer', () => {
  test('navigates from landing page to explorer application', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');
    await expect(page).toHaveTitle(/FloatChat/i);

    // 2. Verify navigation header is present
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // 3. Click Launch Explorer
    const launchBtn = page.getByRole('link', { name: /launch explorer/i }).first();
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // 4. Verify arrival on /app
    await expect(page).toHaveURL(/\/app/);

    // 5. Verify chat input is ready
    const chatInput = page.getByRole('textbox', { name: /ask about ocean data/i });
    await expect(chatInput).toBeVisible();
  });
});

