# Regras internas de código (bloqueio em commit)

Prioridade: estabilidade e comportamento correto. Código novo não pode introduzir:

- react-hooks/rules-of-hooks: hooks sempre no topo, nunca em if/loop/early return.
- react-hooks/set-state-in-effect: evite setState direto em useEffect. Se necessário e idempotente, documente com comentário eslint pontual explicando o motivo.
- react-hooks/purity: não chamar funções impuras (ex.: Date.now) em render; derive via useMemo/efeitos.
- no-undef: nada de variáveis não declaradas.
- any: só onde estritamente necessário; prefira tipos mínimos ou unknown + refinamentos. Deixe TODO para tipar depois quando usar any.

Padrões de implementação (KISS / YAGNI / DRY)

- KISS: soluções simples e previsíveis; sem over-engineering.
- YAGNI: só implemente o que é usado agora; evite código futuro especulativo.
- DRY: extraia helpers reutilizáveis; sem duplicação de lógica.

Boas práticas de Hooks

- Declare todos os hooks no topo do componente. Condicione a lógica dentro do effect/callback, não a declaração do hook.
- Guarde setState em effects com guardas para evitar loops; de preferência derive estado de props com useMemo.
- Mantenha deps de useEffect/useMemo/useCallback completas; estabilize helpers com useCallback quando necessário.

Enforcement

- Pre-commit hook (.githooks/pre-commit) roda ESLint em arquivos staged de `web/` e bloqueia commit em caso de erro.
- Ative localmente: `git config core.hooksPath .githooks`
- Rodar manualmente: `cd web && npx eslint . --max-warnings=0`

