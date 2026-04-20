/**
 * E2E — Ficha PF
 *
 * Variáveis de ambiente necessárias (.env.local ou CI):
 *   E2E_BASE_URL        http://localhost:3000
 *   E2E_EMAIL           analista@mznet.com
 *   E2E_PASSWORD        senha123
 *   E2E_PF_ID           uuid do applicant PF de teste
 *   E2E_PF_CARD_ID      uuid do kanban_card de teste
 *
 * Rodar:
 *   npx playwright test e2e/ficha-pf.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';
import { login } from './helpers/auth';

const PF_ID   = process.env.E2E_PF_ID      || 'SUBSTITUA_PELO_ID_PF';
const CARD_ID = process.env.E2E_PF_CARD_ID || 'SUBSTITUA_PELO_CARD_ID';
const URL     = `/cadastro/pf/${PF_ID}?card=${CARD_ID}&from=analisar`;

// ─── helpers ─────────────────────────────────────────────────────────────────

async function fill(page: Page, label: string | RegExp, value: string) {
  const input = page.getByLabel(label);
  await input.clear();
  await input.fill(value);
  await input.blur();
}

async function selectOption(page: Page, label: string | RegExp, value: string) {
  // SimpleSelect: clica no trigger (botão com o label acima dele)
  const group = page.locator('.field-inline', { hasText: typeof label === 'string' ? label : '' })
    .or(page.locator('div', { has: page.locator('label', { hasText: label }) })).first();
  await group.locator('button[role="combobox"], button').first().click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

async function expectDisabled(page: Page, label: string) {
  const input = page.getByLabel(label);
  await expect(input).toBeDisabled();
}

async function expectEnabled(page: Page, label: string) {
  const input = page.getByLabel(label);
  await expect(input).toBeEnabled();
}

// ─── setup ───────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto(URL);
  await page.waitForSelector('.ficha-pf', { timeout: 15_000 });
});

// ─── SEÇÃO 1: Dados Pessoais ─────────────────────────────────────────────────

test('PF-01 · dados pessoais — preenche campos básicos', async ({ page }) => {
  await fill(page, /nome do cliente/i,    'Maria Teste da Silva');
  await fill(page, /^cpf$/i,              '123.456.789-09');
  await fill(page, /data de nascimento/i, '15/06/1990');
  await fill(page, /^idade$/i,            '34');
  await fill(page, /naturalidade/i,       'São Paulo');
  await fill(page, /^uf$/i,              'SP');
  await fill(page, /e-mail/i,            'maria@teste.com');

  await expect(page.getByLabel(/nome do cliente/i)).toHaveValue('Maria Teste da Silva');
  await expect(page.getByLabel(/^cpf$/i)).toHaveValue('123.456.789-09');
  await expect(page.getByLabel(/^idade$/i)).toHaveValue('34');
});

test('PF-02 · dados pessoais — campo Idade rejeita mais de 2 caracteres', async ({ page }) => {
  const input = page.getByLabel(/^idade$/i);
  await input.fill('999');
  const val = await input.inputValue();
  expect(val.length).toBeLessThanOrEqual(2);
});

// ─── SEÇÃO 2: Contatos ────────────────────────────────────────────────────────

test('PF-03 · telefone — máscara aplicada ao digitar', async ({ page }) => {
  await fill(page, /^telefone$/i, '11987654321');
  await expect(page.getByLabel(/^telefone$/i)).toHaveValue('(11) 98765-4321');
});

test('PF-04 · whatsapp — máscara aplicada ao digitar', async ({ page }) => {
  await fill(page, /whatsapp/i, '11912345678');
  await expect(page.getByLabel(/whatsapp/i)).toHaveValue('(11) 91234-5678');
});

// ─── SEÇÃO 3: Endereço ────────────────────────────────────────────────────────

test('PF-05 · endereço — preenche campos de endereço', async ({ page }) => {
  await fill(page, /endereço$/i,   'Rua das Flores');
  await fill(page, /número/i,      '123');
  await fill(page, /complemento/i, 'Apto 4');
  await fill(page, /cep/i,         '01310100');

  await expect(page.getByLabel(/cep/i)).toHaveValue('01310-100');
});

// ─── SEÇÃO 4: Residência — Tipo de Moradia ────────────────────────────────────

test('PF-06 · campo Observações de moradia permanece editável', async ({ page }) => {
  await selectOption(page, /tipo de moradia/i, 'Outros');
  await expectEnabled(page, /observações/i);
  await fill(page, /observações/i, 'Casa de container');
  await expect(page.getByLabel(/observações/i)).toHaveValue('Casa de container');
});

test('PF-07 · moradia "Outros" → "Própria" mantém Observações preenchidas', async ({ page }) => {
  await selectOption(page, /tipo de moradia/i, 'Outros');
  await fill(page, /observações/i, 'Casa de container');

  await selectOption(page, /tipo de moradia/i, 'Própria');
  await expectEnabled(page, /observações/i);
  await expect(page.getByLabel(/observações/i)).toHaveValue('Casa de container');
});

test('PF-08 · moradia "Alugada" — habilita Nome Locador e Telefone Locador', async ({ page }) => {
  await selectOption(page, /tipo de moradia/i, 'Alugada');
  await expectEnabled(page, /nome locador/i);
  await expectEnabled(page, /telefone locador/i);

  await fill(page, /nome locador/i,     'João Locador');
  await fill(page, /telefone locador/i, '11998877665');
  await expect(page.getByLabel(/telefone locador/i)).toHaveValue('(11) 99887-7665');
});

test('PF-09 · moradia "Alugada" → mudar para "Cedida" — limpa e bloqueia Locador', async ({ page }) => {
  await selectOption(page, /tipo de moradia/i, 'Alugada');
  await fill(page, /nome locador/i, 'João Locador');

  await selectOption(page, /tipo de moradia/i, 'Cedida');
  await expectDisabled(page, /nome locador/i);
  await expectDisabled(page, /telefone locador/i);
  await expect(page.getByLabel(/nome locador/i)).toHaveValue('');
  await expect(page.getByLabel(/telefone locador/i)).toHaveValue('');
});

// ─── SEÇÃO 5: Residência — Única no Lote ────────────────────────────────────

test('PF-10 · campo Única no lote (Obs) permanece editável', async ({ page }) => {
  await selectOption(page, /única no lote$/i, 'Não');
  await expectEnabled(page, /única no lote \(obs\)/i);
  await fill(page, /única no lote \(obs\)/i, 'Duas casas no lote');
  await expect(page.getByLabel(/única no lote \(obs\)/i)).toHaveValue('Duas casas no lote');
});

test('PF-11 · única no lote "Não" → "Sim" mantém Obs preenchida', async ({ page }) => {
  await selectOption(page, /única no lote$/i, 'Não');
  await fill(page, /única no lote \(obs\)/i, 'Duas casas');

  await selectOption(page, /única no lote$/i, 'Sim');
  await expectEnabled(page, /única no lote \(obs\)/i);
  await expect(page.getByLabel(/única no lote \(obs\)/i)).toHaveValue('Duas casas');
});

// ─── SEÇÃO 6: Contrato ────────────────────────────────────────────────────────

test('PF-12 · tem contrato "Não" — Enviou Contrato permanece bloqueado', async ({ page }) => {
  await selectOption(page, /tem contrato/i, 'Não');
  // O select de Enviou Contrato deve estar com opacity/pointer-events desabilitado
  const trigger = page.locator('.field-inline', { hasText: /enviou contrato/i }).locator('button').first();
  await expect(trigger).toHaveClass(/opacity-50|pointer-events-none/);
});

test('PF-13 · tem contrato "Sim" — habilita Enviou Contrato', async ({ page }) => {
  await selectOption(page, /tem contrato/i, 'Sim');
  const trigger = page.locator('.field-inline', { hasText: /enviou contrato/i }).locator('button').first();
  await expect(trigger).not.toHaveClass(/opacity-50/);
});

test('PF-14 · tem contrato "Sim" + enviou contrato "Sim" — habilita Nome De', async ({ page }) => {
  await selectOption(page, /tem contrato/i, 'Sim');
  await selectOption(page, /enviou contrato/i, 'Sim');
  await expectEnabled(page, /nome de/i);
  await fill(page, /nome de/i, 'Maria Teste');
  await expect(page.getByLabel(/nome de/i)).toHaveValue('Maria Teste');
});

test('PF-15 · tem contrato "Sim" → "Não" — limpa Enviou Contrato e Nome De', async ({ page }) => {
  await selectOption(page, /tem contrato/i, 'Sim');
  await selectOption(page, /enviou contrato/i, 'Sim');
  await fill(page, /nome de/i, 'Maria Teste');

  await selectOption(page, /tem contrato/i, 'Não');
  await expectDisabled(page, /nome de/i);
  await expect(page.getByLabel(/nome de/i)).toHaveValue('');
});

// ─── SEÇÃO 7: Comprovante ────────────────────────────────────────────────────

test('PF-16 · enviou comprovante "Não" mantém Tipo e Nome editáveis', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Não');
  const trigger = page.locator('div', { hasText: /tipo de comprovante/i }).locator('button').first();
  await expect(trigger).not.toHaveClass(/opacity-50|pointer-events-none/);
  await expectEnabled(page, /nome do comprovante/i);
});

test('PF-17 · enviou comprovante "Sim" mantém Tipo e Nome editáveis', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Sim');
  const trigger = page.locator('div', { hasText: /tipo de comprovante/i }).locator('button').first();
  await expect(trigger).not.toHaveClass(/opacity-50/);
  await expectEnabled(page, /nome do comprovante/i);
});

test('PF-18 · todas opções de Tipo de Comprovante são selecionáveis', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Sim');
  for (const opt of ['Energia', 'Agua', 'Internet', 'Outro']) {
    await selectOption(page, /tipo de comprovante/i, opt);
    const trigger = page.locator('div', { hasText: /tipo de comprovante/i }).locator('button').first();
    await expect(trigger).toContainText(opt);
  }
});

test('PF-19 · enviou comprovante "Sim" → "Não" preserva Tipo e Nome', async ({ page }) => {
  await selectOption(page, /enviou comprovante/i, 'Sim');
  await selectOption(page, /tipo de comprovante/i, 'Energia');
  await fill(page, /nome do comprovante/i, 'João da Silva');

  await selectOption(page, /enviou comprovante/i, 'Não');
  const trigger = page.locator('div', { hasText: /tipo de comprovante/i }).locator('button').first();
  await expect(trigger).toContainText('Energia');
  await expect(page.getByLabel(/nome do comprovante/i)).toHaveValue('João da Silva');
});

// ─── SEÇÃO 8: Vínculo ────────────────────────────────────────────────────────

test('PF-20 · campo Vínculo Obs permanece editável', async ({ page }) => {
  await selectOption(page, /^vínculo$/i, 'Outro');
  await expectEnabled(page, /vínculo \(obs\)/i);
  await fill(page, /vínculo \(obs\)/i, 'Freelancer');
  await expect(page.getByLabel(/vínculo \(obs\)/i)).toHaveValue('Freelancer');
});

test('PF-21 · vínculo "Outro" → "Concursado" mantém Obs preenchida', async ({ page }) => {
  await selectOption(page, /^vínculo$/i, 'Outro');
  await fill(page, /vínculo \(obs\)/i, 'Freelancer');

  await selectOption(page, /^vínculo$/i, 'Concursado');
  await expectEnabled(page, /vínculo \(obs\)/i);
  await expect(page.getByLabel(/vínculo \(obs\)/i)).toHaveValue('Freelancer');
});

test('PF-22 · todos os vínculos são selecionáveis', async ({ page }) => {
  const opts = ['Carteira Assinada','Presta Serviços','Contrato de Trabalho','Autonômo','Concursado','Outro'];
  for (const opt of opts) {
    await selectOption(page, /^vínculo$/i, opt);
  }
});

// ─── SEÇÃO 9: Estado Civil ────────────────────────────────────────────────────

test('PF-23 · todos os estados civis são selecionáveis', async ({ page }) => {
  const opts = ['Solteiro(a)','Casado(a)','Amasiado(a)','Separado(a)','Viuvo(a)'];
  for (const opt of opts) {
    await selectOption(page, /estado civil/i, opt);
  }
});

// ─── SEÇÃO 10: Cônjuge ────────────────────────────────────────────────────────

test('PF-24 · dados do cônjuge — preenche todos os campos', async ({ page }) => {
  await fill(page, /cônjuge.*nome|nome.*cônjuge/i,        'Pedro Cônjuge');
  await fill(page, /cônjuge.*telefone|telefone.*cônjuge/i, '11977776666');
  await fill(page, /cônjuge.*cpf|cpf.*cônjuge/i,          '98765432100');
  await fill(page, /cônjuge.*naturalidade/i,               'Rio de Janeiro');
  await fill(page, /cônjuge.*uf/i,                         'RJ');
  await fill(page, /cônjuge.*idade/i,                      '32');
});

// ─── SEÇÃO 11: Filiação ────────────────────────────────────────────────────────

test('PF-25 · filiação — preenche pai e mãe', async ({ page }) => {
  await fill(page, /pai.*nome|nome.*pai/i,     'José Pai');
  await fill(page, /pai.*reside/i,             'São Paulo - SP');
  await fill(page, /pai.*telefone/i,           '11944445555');
  await fill(page, /mãe.*nome|nome.*mãe/i,    'Ana Mãe');
  await fill(page, /mãe.*reside/i,             'Campinas - SP');
  await fill(page, /mãe.*telefone/i,           '11933334444');
});

// ─── SEÇÃO 12: Referências ────────────────────────────────────────────────────

test('PF-26 · referências pessoais — preenche ref1 e ref2', async ({ page }) => {
  await fill(page, /ref1.*nome|ref 1.*nome/i,      'Carlos Ref1');
  await fill(page, /ref1.*parentesco/i,             'Irmão');
  await fill(page, /ref1.*reside/i,                 'São Paulo');
  await fill(page, /ref1.*telefone/i,               '11966665555');
  await fill(page, /ref2.*nome|ref 2.*nome/i,      'Ana Ref2');
  await fill(page, /ref2.*parentesco/i,             'Prima');
  await fill(page, /ref2.*telefone/i,               '11955554444');
});

// ─── SEÇÃO 13: Plano / Agendamento ────────────────────────────────────────────

test('PF-27 · vencimento — todas as opções disponíveis', async ({ page }) => {
  for (const opt of ['5','10','15','20','25']) {
    await selectOption(page, /vencimento/i, opt);
  }
});

test('PF-28 · carnê impresso — alterna Sim e Não', async ({ page }) => {
  await selectOption(page, /carnê impresso/i, 'Sim');
  await selectOption(page, /carnê impresso/i, 'Não');
});

// ─── SEÇÃO 14: Solicitação ────────────────────────────────────────────────────

test('PF-29 · solicitação — preenche quem solicitou e protocolo', async ({ page }) => {
  await fill(page, /quem solicitou/i,    'Carlos Vendedor');
  await fill(page, /telefone.*solicitante/i, '11988887777');
  await fill(page, /protocolo mk/i,     '12345');

  await expect(page.getByLabel(/quem solicitou/i)).toHaveValue('Carlos Vendedor');
});

test('PF-30 · meio de captação — todas as opções disponíveis', async ({ page }) => {
  for (const opt of ['Ligação','Whatspp','Presensicial','Whats - Uber']) {
    await selectOption(page, /^meio$/i, opt);
  }
});

// ─── SEÇÃO 15: Tem Internet Fixa ──────────────────────────────────────────────

test('PF-31 · tem internet fixa — Sim preenche empresa e plano', async ({ page }) => {
  await selectOption(page, /tem internet fixa/i, 'Sim');
  await fill(page, /empresa internet/i, 'Vivo Fibra');
  await fill(page, /obs:/i,             '300 Mega');
});

test('PF-32 · tem internet fixa — Não mantém campos vazios', async ({ page }) => {
  await selectOption(page, /tem internet fixa/i, 'Não');
  await expect(page.getByLabel(/empresa internet/i)).toBeEnabled();
});

// ─── SEÇÃO 16: Fluxo completo — alugada + contrato + comprovante ──────────────

test('PF-33 · fluxo completo — moradia alugada com contrato e comprovante', async ({ page }) => {
  // Moradia
  await selectOption(page, /tipo de moradia/i, 'Alugada');
  await fill(page, /nome locador/i,     'Roberto Locador');
  await fill(page, /telefone locador/i, '11912341234');

  // Única no lote
  await selectOption(page, /única no lote$/i, 'Não');
  await fill(page, /única no lote \(obs\)/i, 'Fundo do lote');

  // Contrato
  await selectOption(page, /tem contrato/i, 'Sim');
  await selectOption(page, /enviou contrato/i, 'Sim');
  await fill(page, /nome de/i, 'Roberto Locador');

  // Comprovante (auto-preenchido pelo contrato)
  await expectEnabled(page, /nome do comprovante/i);

  // Vínculo
  await selectOption(page, /^vínculo$/i, 'Outro');
  await fill(page, /vínculo \(obs\)/i, 'MEI');

  await expect(page.getByLabel(/nome locador/i)).toHaveValue('Roberto Locador');
  await expect(page.getByLabel(/nome de/i)).toHaveValue('Roberto Locador');
});

// ─── SEÇÃO 17: Fluxo reverso — garantir limpeza em cascata ───────────────────

test('PF-34 · reversão completa — dados condicionais são limpos ao mudar pai', async ({ page }) => {
  // Configura tudo
  await selectOption(page, /tipo de moradia/i,  'Alugada');
  await fill(page, /nome locador/i, 'Alguém');

  await selectOption(page, /única no lote$/i, 'Não');
  await fill(page, /única no lote \(obs\)/i, 'Obs');

  await selectOption(page, /tem contrato/i, 'Sim');
  await selectOption(page, /enviou contrato/i, 'Sim');
  await fill(page, /nome de/i, 'Alguém');

  await selectOption(page, /enviou comprovante/i, 'Sim');
  await fill(page, /nome do comprovante/i, 'Alguém');

  await selectOption(page, /^vínculo$/i, 'Outro');
  await fill(page, /vínculo \(obs\)/i, 'Freelancer');

  // Reverte tudo
  await selectOption(page, /tipo de moradia/i,  'Própria');
  await selectOption(page, /única no lote$/i,   'Sim');
  await selectOption(page, /tem contrato/i,     'Não');
  await selectOption(page, /enviou comprovante/i,'Não');
  await selectOption(page, /^vínculo$/i,         'Carteira Assinada');

  // Verifica limpeza
  await expect(page.getByLabel(/nome locador/i)).toHaveValue('');
  await expect(page.getByLabel(/única no lote \(obs\)/i)).toHaveValue('');
  await expect(page.getByLabel(/nome de/i)).toHaveValue('');
  await expect(page.getByLabel(/nome do comprovante/i)).toHaveValue('');
  await expect(page.getByLabel(/vínculo \(obs\)/i)).toHaveValue('');
});
