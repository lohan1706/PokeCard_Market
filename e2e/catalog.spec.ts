import { expect, test } from '@playwright/test';

test.describe('catalog', () => {
  test('searches, filters, paginates and opens a card', async ({ page }) => {
    await page.goto('/cards');
    await expect(page.getByRole('heading', { name: 'Cartes' })).toBeVisible();
    await expect(page.getByText('9 cartes')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lumisprite' })).toBeVisible();

    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByText('Page 2 sur 2')).toBeVisible();

    await page.getByRole('textbox', { name: 'Nom' }).fill('Cendragon');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByText('1 carte')).toBeVisible();
    await page.getByRole('link', { name: /Cendragon/ }).click();
    await expect(page).toHaveURL(/\/cards\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Cendragon' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /Holo.*USD/ })).toBeVisible();

    await page.getByRole('link', { name: 'Retour au catalogue' }).click();
    await page.getByLabel('Extension').selectOption({ label: 'Lumen Démo' });
    await expect(page.getByRole('heading', { name: 'Lumisprite' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Brumette' })).toHaveCount(0);

    await page.getByLabel('Rareté').selectOption('Common');
    await expect(page.getByText('1 carte')).toBeVisible();

    await page.goto('/cards?name=zzzz-introuvable');
    await expect(page.getByText('Aucune carte ne correspond à cette recherche.')).toBeVisible();
  });

  test('shows a loading state and an error state', async ({ page }) => {
    await page.route('**/api/v1/cards**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.goto('/cards?name=Voltige');
    await expect(page.getByText('Chargement du catalogue')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Voltige' })).toBeVisible();
    await page.unroute('**/api/v1/cards**');

    await page.route('**/api/v1/cards**', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.getByRole('textbox', { name: 'Nom' }).fill('Orageon');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByText('Le catalogue est indisponible.')).toBeVisible();
  });
});
