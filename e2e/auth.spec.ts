import { expect, test } from '@playwright/test';

test.describe('authentication', () => {
  test.describe.configure({ mode: 'serial' });

  test('registers, logs in, opens the dashboard, and logs out', async ({ page }) => {
    const email = `e2e.${Date.now()}@auth.test`;

    await page.goto('/register');
    await page.getByLabel('Nom affiché').fill('Camille E2E');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Mot de passe').fill('Motdepasse1');
    await page.getByRole('button', { name: 'Créer le compte' }).click();

    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByText('Compte créé. Vous pouvez vous connecter.')).toBeVisible();

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Mot de passe').fill('Motdepasse1');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText('Collectionneur')).toBeVisible();

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test('keeps a collector out of administration and lets an admin in', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('lea.martin@demo.pokecard.local');
    await page.getByLabel('Mot de passe').fill('DemoCollector!2026');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

    await page.goto('/admin');
    await expect(page.getByText('Accès refusé')).toBeVisible();
    await page.getByRole('link', { name: 'Retour au tableau de bord' }).click();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();

    await page.getByLabel('E-mail').fill('camille.admin@demo.pokecard.local');
    await page.getByLabel('Mot de passe').fill('DemoAdmin!2026');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByRole('link', { name: 'Administration' }).click();
    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
    await expect(page.getByText(/\d+ comptes/)).toBeVisible();
  });
});
