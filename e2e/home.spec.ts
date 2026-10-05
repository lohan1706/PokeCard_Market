import { expect, test } from '@playwright/test';

test('the infrastructure home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PokéCard Market' })).toBeVisible();
});
