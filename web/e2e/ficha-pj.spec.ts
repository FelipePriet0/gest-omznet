/**
 * E2E — Ficha PJ
 *
 * Variáveis de ambiente necessárias (.env.local ou CI):
 *   E2E_BASE_URL        http://localhost:3000
 *   E2E_EMAIL           analista@mznet.com
 *   E2E_PASSWORD        senha123
 *   E2E_PJ_ID           uuid do applicant PJ de teste
 *   E2E_PJ_CARD_ID      uuid do kanban_card de teste
 *
 * Rodar:
 *   npx playwright test e2e/ficha-pj.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';
import { login } from './helpers/auth';

const PJ_ID   = process.env.E2E_PJ_ID      || 'SUBSTITUA_PELO_ID_PJ';
const CARD_ID = process.env.E2E_PJ_CARD_ID || 'SUBSTITUA_PELO_CARD_ID';
const URL     = `/cadastro/pj/${PJ_ID}?card=${CARD_ID}&from=analisar`;

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fill(page: Page, label: string | RegExp, value: string) {
  const input = page.getByLabel(label);
  await input.clear();
  await input.fill(value);
  await input.blur();
}

async function selectOption(page: Page, label: string | RegExp, value: string) {
  const group = page.locator('.field-inline', { hasText: typeof label === 'string' ? label : '' })
    .or(page.locator('div', { has: page.locator('label', { hasText: label }) })).first();
  await group.locator('button[role="combobox"], button').first().click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

async function expectDisabled(page: Page, label: string) {
  await expect(page.getByLabel(label)).toBeDisabled();
}

async function expectEnabled(page: Page, label: string) {
  await expect(page.getByLabel(label)).toBeEnabled();
}

// ─── setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto(URL);
  await page.waitForSelector('.ficha-pj', { timeout: 15_000 });
});

// ─── SEÇÃO 1: Dados da Empresa ────────────────────────────────────────────────

test('PJ-01 · dados da empresa — preenche campos básicos', async ({ page }) => {
  await fill(page, /razão social/i,    'Empresa Teste Ltda');
  await fill(page, /cnpj/i,            '12345678000195');
  await fill(page, /data de abertura/i,'10/03/2015');
  await fill(page, /nome fantasia/i,   'Empresa Teste');
  await fill(page, /nome de fachada/i, 'Loja Teste');
  await fill(page, /área de atuação/i, 'Comércio Varejista');

  await expect(page.getByLabel(/razão social/i)).toHaveValue('Empresa Teste Ltda');
});

test('PJ-02 · CNPJ — máscara aplicada', async ({ page }) => {
  await fill(page, /cnpj/i, '12345678000195');
  await expect(page.getByLabel(/cnpj/i)).toHaveValue('12.345.678/0001-95');
});

test('PJ-03 · data de abertura — máscara aplicada', async ({ page }) => {
  await fill(page, /data de abertura/i, '10032015');
  await expect(page.getByLabel(/data de abertura/i)).toHaveValue('10/03/2015');
});

// ─── SEÇÃO 2: Contatos ────────────────────────────────────────────────────────

test('PJ-04 · telefone — máscara aplicada', async ({ page }) => {
  await fill(page, /^telefone$/i, '11987654321');
  await expect(page.getByLabel(/^telefone$/i)).toHaveValue('(11) 98765-4321');
});

test('PJ-05 · whatsapp — máscara aplicada', async ({ page }) => {
  await fill(page, /whatsapp/i, '11912345678');
  await expect(page.getByLabel(/whatsapp/i)).toHaveValue('(11) 91234-5678');
});

test('PJ-06 · e-mail — preenche livremente', async ({ page }) => {
  await fill(page, /e-mail/i, 'empresa@teste.com');
  await expect(page.getByLabel(/e-mail/i)).toHaveValue('empresa@teste.com');
});

// ─── SEÇÃO 3: Endereço ────────────────────────────────────────────────────────

test('PJ-07 · endereço — preenche todos os campos', async ({ page }) => {
  await fill(page, /endereço$/i,        'Av. Paulista');
  await fill(page, /número/i,           '1000');
  await fill(page, /complemento/i,      'Sala 5');
  await fill(page, /cep/i,              '01310100');
  await fill(page, /tempo no endereço/i,'3 anos');

  await expect(page.getByLabel(/cep/i)).toHaveValue('01310-100');
});

test('PJ-08 · tipo de imóvel — todas as opções', async ({ page }) => {
  for (const opt of ['Comércio Terreo','Comércio Sala','Casa']) {
    await selectOption(page, /tipo de imóvel/i, opt);
  }
});

test('PJ-09 · tipo de estabelecimento — todas as opções', async ({ page }) => {
  for (const opt of ['Própria','Alugada','Cedida','Outros']) {
    await selectOption(page, /tipo de estabelecimento/i, opt);
  }
});

// ─── SEÇÃO 4: Internet ────────────────────────────────────────────────────────

test('PJ-10 · possui internet — Sim preenche operadora e plano', async ({ page }) => {
  await selectOption(page, /possui internet/i, 'Sim');
  await fill(page, /operadora internet/i, 'Claro Fibra');
  await fill(page, /plano internet/i,     '500 Mega');
  await fill(page, /valor internet/i,     '15000');

  await expect(page.getByLabel(/operadora internet/i)).toHaveValue('Claro Fibra');
});

test('PJ-11 · possui internet — Não não bloqueia campos de internet', async ({ page }) => {
  await selectOption(page, /possui internet/i, 'Não');
  await expectEnabled(page, /operadora internet/i);
});

// ─── SEÇÃO 5: Comprovante ────────────────────────────────────────────────────

test('PJ-12 · enviou comprovante "Não" — bloqueia Tipo e Em nome de', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Não');
  const trigger = page.locator('div', { hasText: /tipo de comprovante/i }).locator('button').first();
  await expect(trigger).toHaveClass(/opacity-50|pointer-events-none/);
  await expectDisabled(page, /em nome de/i);
});

test('PJ-13 · enviou comprovante "Sim" — habilita Tipo e Em nome de', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Sim');
  const trigger = page.locator('div', { hasText: /tipo de comprovante/i }).locator('button').first();
  await expect(trigger).not.toHaveClass(/opacity-50/);
  await expectEnabled(page, /em nome de/i);
});

test('PJ-14 · todas as opções de Tipo de Comprovante', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Sim');
  for (const opt of ['Energia','Agua','Internet','Outro']) {
    await selectOption(page, /tipo de comprovante/i, opt);
  }
});

test('PJ-15 · enviou comprovante "Sim" → "Não" — limpa Tipo e Em nome de', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Sim');
  await selectOption(page, /tipo de comprovante/i, 'Energia');
  await fill(page, /em nome de/i, 'Empresa Teste Ltda');

  await selectOption(page, /enviou comprovante/i, 'Não');
  await expect(page.getByLabel(/em nome de/i)).toHaveValue('');
});

// ─── SEÇÃO 6: Contrato Social ─────────────────────────────────────────────────

test('PJ-16 · contrato social — Sim e Não', async ({ page }) => {
  await selectOption(page, /contrato social/i, 'Sim');
  await selectOption(page, /contrato social/i, 'Não');
});

test('PJ-17 · observações do contrato social', async ({ page }) => {
  await fill(page, /obs.*contrato|observações.*contrato/i, 'Contrato registrado em cartório');
});

// ─── SEÇÃO 7: Sócios ──────────────────────────────────────────────────────────

test('PJ-18 · sócios — preenche 3 sócios', async ({ page }) => {
  await fill(page, /sócio 1.*nome|nome.*sócio 1/i,  'Ana Sócia 1');
  await fill(page, /sócio 1.*cpf|cpf.*sócio 1/i,   '11122233344');
  await fill(page, /sócio 1.*tel/i,                  '11999998888');

  await fill(page, /sócio 2.*nome|nome.*sócio 2/i,  'Bruno Sócio 2');
  await fill(page, /sócio 2.*cpf|cpf.*sócio 2/i,   '55566677788');
  await fill(page, /sócio 2.*tel/i,                  '11988887777');

  await fill(page, /sócio 3.*nome|nome.*sócio 3/i,  'Clara Sócia 3');
  await fill(page, /sócio 3.*cpf|cpf.*sócio 3/i,   '99988877766');

  await expect(page.getByLabel(/sócio 1.*nome|nome.*sócio 1/i)).toHaveValue('Ana Sócia 1');
});

// ─── SEÇÃO 8: Tipo de Instalação ──────────────────────────────────────────────

test('PJ-19 · tipo de instalação — todas as opções PJ', async ({ page }) => {
  for (const opt of ['XXXX','Casa','Prédio com Prumada','Prédio sem Prumada','Wi-Fi Extend']) {
    await selectOption(page, /tipo de instalação/i, opt);
  }
});

// ─── SEÇÃO 9: Plano / Comercial ───────────────────────────────────────────────

test('PJ-20 · vencimento — todas as opções', async ({ page }) => {
  for (const opt of ['5','10','15','20','25']) {
    await selectOption(page, /vencimento/i, opt);
  }
});

test('PJ-21 · carnê impresso — alterna', async ({ page }) => {
  await selectOption(page, /carnê impresso/i, 'Sim');
  await selectOption(page, /carnê impresso/i, 'Não');
});

test('PJ-22 · meio de captação — todas as opções', async ({ page }) => {
  for (const opt of ['Ligação','Whatspp','Presensicial','Whats - Uber']) {
    await selectOption(page, /^meio$/i, opt);
  }
});

// ─── SEÇÃO 10: Solicitação ────────────────────────────────────────────────────

test('PJ-23 · solicitação — preenche campos', async ({ page }) => {
  await fill(page, /quem solicitou/i,       'Vendedor PJ');
  await fill(page, /telefone.*solicitante/i, '11977776666');
  await fill(page, /protocolo mk/i,          '99887');
});

// ─── SEÇÃO 11: Fluxo completo PJ ─────────────────────────────────────────────

test('PJ-24 · fluxo completo — empresa com comprovante e sócio', async ({ page }) => {
  await fill(page, /razão social/i,    'Tech PJ Ltda');
  await fill(page, /cnpj/i,            '11222333000181');
  await fill(page, /data de abertura/i,'01012020');

  await selectOption(page, /tipo de imóvel/i,         'Comércio Sala');
  await selectOption(page, /tipo de estabelecimento/i, 'Alugada');
  await fill(page, /obs.*estabelecimento/i,            'Sala 202');

  await selectOption(page, /possui internet/i,     'Sim');
  await fill(page, /operadora internet/i,          'Vivo Fibra');
  await fill(page, /valor internet/i,              '20000');

  await selectOption(page, /enviou comprovante/i,  'Sim');
  await selectOption(page, /tipo de comprovante/i, 'Energia');
  await fill(page, /em nome de/i,                  'Tech PJ Ltda');

  await selectOption(page, /contrato social/i, 'Sim');

  await fill(page, /sócio 1.*nome|nome.*sócio 1/i, 'Carlos Fundador');
  await fill(page, /sócio 1.*cpf|cpf.*sócio 1/i,  '12312312300');

  await selectOption(page, /vencimento/i,       '10');
  await selectOption(page, /carnê impresso/i,   'Não');
  await selectOption(page, /^meio$/i,           'Whatspp');

  await expect(page.getByLabel(/razão social/i)).toHaveValue('Tech PJ Ltda');
  await expect(page.getByLabel(/em nome de/i)).toHaveValue('Tech PJ Ltda');
});

// ─── SEÇÃO 12: Reversão — comprovante limpo ao marcar "Não" ──────────────────

test('PJ-25 · reversão — comprovante limpo ao marcar Não', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i,  'Sim');
  await selectOption(page, /tipo de comprovante/i, 'Internet');
  await fill(page, /em nome de/i, 'Empresa XYZ');

  await selectOption(page, /enviou comprovante/i, 'Não');

  await expect(page.getByLabel(/em nome de/i)).toHaveValue('');
  await expectDisabled(page, /em nome de/i);
});
