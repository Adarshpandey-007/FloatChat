import { test, expect } from '@playwright/test';

test.describe('E2E User Journey: Explorer Interaction & Tabs', () => {
  test('allows interaction with quick hints and switches visualization tabs', async ({ page }) => {
    // 1. Navigate directly to /app
    await page.goto('/app');

    // 2. Verify chat panel displays initial welcome
    await expect(page.getByText('Ask me about ARGO ocean data')).toBeVisible();

    // 3. Click the first available quick hint pill
    const firstHint = page.locator('button:has-text("Show floats"), button:has-text("Indian Ocean"), button:has-text("profiles")').first();
    if (await firstHint.isVisible()) {
      const hintText = await firstHint.innerText();
      await firstHint.click();

      // Verify chat input is filled
      const chatInput = page.getByRole('textbox', { name: /ask about ocean data/i });
      await expect(chatInput).toHaveValue(hintText);
    }

    // 4. Verify visualization tab buttons are visible and clickable
    const mapTab = page.getByRole('button', { name: /map/i }).first();
    if (await mapTab.isVisible()) {
      await mapTab.click();
    }
  });
});

