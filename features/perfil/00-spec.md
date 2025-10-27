**Objetivo em 1 frase:**

Permitir que o usuário faça login, acesse e edite seu perfil de forma segura, com dados sincronizados entre Auth e tabela

```
profiles
```

.

### ✅ Resultado esperado (DONE = verdadeiro quando…)

- [ ]  Usuário consegue logar via e-mail e senha.
- [ ]  Dados do perfil carregam automaticamente após login.
- [ ]  Campos atualizados refletem no banco em tempo real.
- [ ]  Edição restrita ao próprio `auth.uid()`.
- [ ]  Logout encerra sessão e limpa estado local.

### 🧭 Fluxo simples (passo a passo)

1️⃣ Usuário acessa `/login`.

2️⃣ Envia credenciais → validação no Supabase Auth.

3️⃣ Redireciona para `/profiles` ao sucesso.

4️⃣ `/profiles` carrega dados de `profiles` (`id`, `full_name` (Preenchido depois), `email`, `role`, `created_at`, `updated_at`).

5️⃣ Usuário edita e salva → `PUT /api/perfil` → atualização na tabela.

6️⃣ Toast confirma sucesso → UI recarrega os dados.

### 🗄️ Tabelas envolvidas

- `auth.users` → autenticação principal.
- `public.profiles` → extensão do usuário (dados internos).

Relação: `profiles.id = auth.uid()`.

### 🔐 Permissões (RLS)

| Auth | Ações permitidas |
| --- | --- |
| Vendedor | Editar **apenas seu próprio** perfil. |
| Analista | Editar **apenas seu próprio** perfil. |
| Gestor | Editar **apenas seu próprio** perfil. |

### 🚫 Fora de escopo

- Troca de senha via e-mail (será tratada futuramente).
- Upload de avatar (ficará para a segunda fase).

### Aba perfil no Front:

- Header Section: 

Titulo e Descrição: 
”Seu perfil”
”Gerencie suas informações pessoais”
- Conteúdo Principal: 

”Nome completo” 
”E-mail” 
”Função” Apenas Leitura
- SEÇÃO: AÇÕES     

[Salvar Alterações] [Sair da Conta]
- Hooks

Nome completo —Hook—> Public.profiles.Full_name
E-mail —Hook—> Public.profiles.email

- **Regras de Acesso (Row Level Security)**

| Função | Vendedor | Analista | Gestor |
| --- | --- | --- | --- |
| Nome completo | ✓ | ✓ | ✓ |
| E-mail | ✓ | ✓ | ✓ |
| Função | ✗ (Apenas leitura) | ✗ (Apenas leitura) | ✗ (Apenas leitura) |

##