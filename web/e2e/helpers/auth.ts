import { Page } from '@playwright/test';

export async function login(page: Page) {
  const email = process.env.E2E_EMAIL || '';
  const password = process.env.E2E_PASSWORD || '';

  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/(kanban|agenda|cadastro)/, { timeout: 15_000 });
}
