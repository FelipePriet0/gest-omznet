# Remoção futura: Feature de Export PDF da Ficha (PF/PJ)

> **Status atual:** Feature oculta (`exportarFicha: false`). Ninguém consegue usar pela UI.
> Rotas de API existem mas estão protegidas por auth.
> **Não remover agora** — aguardar priorização.

---

## Pontos de existência (delete tudo isso quando for remover)

### 1. API Routes (Backend)
| Arquivo | O que deletar |
|---|---|
| `web/app/api/export/ficha/[tipo]/[id]/route.ts` | Deletar o arquivo inteiro |
| `web/app/api/export/ficha/route.ts` | Deletar o arquivo inteiro |
| `web/middleware.ts` | Remover o bloco `if (pathname.startsWith("/api/export"))` e o matcher `"/api/export/:path*"` |

### 2. Frontend — Botão e lógica de download
Arquivo: `web/app/(app)/AppLayoutClient.tsx`
- Remover a função que monta a URL `/api/export/ficha/${tipo}/${id}` (linha ~172)
- Remover o bloco do botão "Exportar PDF" (linha ~316–320, dentro de `{isExpandedCadastro && FEATURES.exportarFicha && ...}`)

### 3. Feature Flag
Arquivo: `web/lib/features.ts`
- Remover a linha `exportarFicha: false` (linha ~13) e o comentário acima dela

### 4. Páginas de Ficha — elemento alvo do headless browser
| Arquivo | O que remover |
|---|---|
| `web/app/(app)/cadastro/pf/[id]/page.tsx` | Remover `id="mz-print-root"` e `data-name={...}` do elemento raiz da ficha expandida (linha ~883) |
| `web/app/(app)/cadastro/pj/[id]/page.tsx` | Idem (linha ~779) |

### 5. Dependências de pacote
Arquivo: `web/package.json` — avaliar se ainda são usadas em outro lugar antes de remover:
- `@sparticuz/chromium` — só usado pelo export
- `puppeteer-core` — só usado pelo export
- `playwright` (devDependency) — só usado pelo export

### 6. Banco de dados
Nenhuma tabela ou função SQL foi criada exclusivamente para esta feature.
O export apenas lê dados que já existem (PF/PJ fichas via página renderizada).

---

## Ordem de remoção sugerida
1. Deletar `web/app/api/export/ficha/` (pasta inteira)
2. Limpar `web/middleware.ts`
3. Limpar `web/app/(app)/AppLayoutClient.tsx`
4. Remover `exportarFicha` de `web/lib/features.ts`
5. Remover `id="mz-print-root"` das páginas PF e PJ
6. Desinstalar `@sparticuz/chromium puppeteer-core` (e playwright se não houver outro uso)
