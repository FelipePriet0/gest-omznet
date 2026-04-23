# Infraestrutura MzNet — Visão Geral

> Este documento descreve a arquitetura completa da infraestrutura MzNet, incluindo todos os projetos, containers e conexões que compartilham o mesmo servidor.

---

## Servidor (VPS)

| Item | Valor |
|---|---|
| IP | `38.43.76.166` |
| Sistema Operacional | Ubuntu 20.04.6 LTS |
| Usuário | `jjmznet` |
| Porta SSH | `22952` |

```bash
ssh mznetolt
```

---

## Os 3 Projetos

### 1. MznetOLT
- **Domínio:** `https://olt.mznet.digital`
- **Pasta no servidor:** `/home/jjmznet/mznetolt/`
- **Função:** Plataforma de gerenciamento de OLTs e ONUs para ISP
- **Stack:** Next.js · Node.js API · PostgreSQL 15 · Redis
- **Banco:** PostgreSQL local (`mznet_postgres` — container Docker)

### 2. GestãoMzNet ← *este projeto*
- **Domínio:** `https://mznet.digital`
- **Pasta no servidor:** `/home/jjmznet/gestaomznet/`
- **Função:** Sistema interno de gestão
- **Stack:** Next.js · Supabase PRO
- **Banco:** Supabase PRO nuvem (`dlamovqrabpqdqotodep`)

### 3. Multi-Agent Inadimplência
- **Acesso:** somente rede interna Docker (sem domínio público)
- **Pasta no servidor:** `/home/jjmznet/multiagent-inadimplencia/`
- **Função:** IA com múltiplos agentes para prevenção de inadimplência
- **Stack:** Python 3.11 · LangGraph · Claude (Anthropic) · Supabase PRO
- **Banco:** mesmo Supabase PRO do GestãoMzNet (checkpointing + playbook)

---

## Arquitetura de Containers

```
VPS (38.43.76.166)
│
├── mznet_nginx  ──────────────────── Nginx · porta 80 + 443
│   ├── olt.mznet.digital   ──────── MznetOLT
│   └── mznet.digital       ──────── GestãoMzNet
│
├── MznetOLT  (/home/jjmznet/mznetolt/)
│   ├── mznet_frontend      ──────── Next.js (porta interna 3000)
│   ├── mznet_backend       ──────── API Node.js (porta interna 3001)
│   ├── mznet_postgres      ──────── PostgreSQL 15 (porta interna 5432)
│   ├── mznet_redis         ──────── Redis 7 (porta interna 6379)
│   └── mznet_workers       ──────── Workers
│
├── GestãoMzNet  (/home/jjmznet/gestaomznet/)
│   └── gestaomznet_frontend ─────── Next.js (porta interna 3000)
│
└── Multi-Agent IA  (/home/jjmznet/multiagent-inadimplencia/)
    └── multiagent_inadimplencia ─── Python 3.11 + LangGraph
```

**Total: 8 containers** na rede Docker `mznetolt_default`.

---

## Rede Interna Docker

Todos os containers se comunicam pela rede `mznetolt_default` — sem passar pela internet.

| Conexão | URL interna |
|---|---|
| Multi-Agent → GestãoMzNet | `http://gestaomznet_frontend:3000` |
| Backend → Postgres | `postgres:5432` |
| Backend → Redis | `redis:6379` |

> O Multi-Agent acessa a API do GestãoMzNet diretamente pela rede Docker. Nunca usar `https://mznet.digital` dentro dos agentes — usar sempre a URL interna.

---

## Banco de Dados

| Projeto | Tipo | Onde |
|---|---|---|
| MznetOLT | PostgreSQL 15 | Container local `mznet_postgres` |
| GestãoMzNet | Supabase PRO | `dlamovqrabpqdqotodep.supabase.co` |
| Multi-Agent | Supabase PRO | mesmo projeto do GestãoMzNet |

---

## DNS e SSL

- **DNS:** domínio `mznet.digital` gerenciado na **Vercel** (registros A apontando para `38.43.76.166`)
- **SSL:** certificados Let's Encrypt via Certbot · renovação automática todo segunda às 3h · vence em 90 dias
- **Domínios cobertos:** `mznet.digital`, `www.mznet.digital`, `olt.mznet.digital`

---

## Comandos Rápidos

```bash
# Status de todos os containers
docker ps

# Logs deste projeto (GestãoMzNet)
cd /home/jjmznet/gestaomznet
docker compose logs -f

# Deploy de nova versão
cd /home/jjmznet/gestaomznet
git pull
docker compose up -d --build

# Recarregar Nginx sem derrubar
docker exec mznet_nginx nginx -s reload
```

---

## Referências

| Recurso | Onde |
|---|---|
| Infraestrutura completa | `HANDOVER_INFRA.md` em `/home/jjmznet/steve/` |
| Painel Supabase | [supabase.com](https://supabase.com) → projeto `dlamovqrabpqdqotodep` |
| DNS | [vercel.com](https://vercel.com) → Settings → Domains |
| API Anthropic (agentes IA) | [console.anthropic.com](https://console.anthropic.com) |
